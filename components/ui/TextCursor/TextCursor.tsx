'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import styles from './TextCursor.module.css';

interface TextCursorProps {
  text?: string;
  spacing?: number;
  followMouseDirection?: boolean;
  randomFloat?: boolean;
  exitDuration?: number;
  removalInterval?: number;
  maxPoints?: number;
}

interface TrailItem {
  id: number;
  x: number;
  y: number;
  angle: number;
  randomX?: number;
  randomY?: number;
  randomRotate?: number;
}

const TextCursor: React.FC<TextCursorProps> = ({
  text = '⚛️',
  spacing = 100,
  followMouseDirection = true,
  randomFloat = true,
  exitDuration = 0.5,
  removalInterval = 30,
  maxPoints = 5,
}) => {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const lastMoveTimeRef = useRef<number>(0);
  const idCounter = useRef<number>(0);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      setTrail(prev => {
        const newTrail = [...prev];

        const createRandomData = () =>
          randomFloat
            ? {
                randomX: Math.random() * 10 - 5,
                randomY: Math.random() * 10 - 5,
                randomRotate: Math.random() * 10 - 5,
              }
            : {};

        if (newTrail.length === 0) {
          newTrail.push({
            id: idCounter.current++,
            x: mouseX,
            y: mouseY,
            angle: 0,
            ...createRandomData(),
          });
        } else {
          const last = newTrail[newTrail.length - 1];
          const dx = mouseX - last.x;
          const dy = mouseY - last.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance >= spacing) {
            const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const computedAngle = followMouseDirection ? rawAngle : 0;
            const steps = Math.floor(distance / spacing);

            for (let i = 1; i <= steps; i++) {
              const t = (spacing * i) / distance;
              const newX = last.x + dx * t;
              const newY = last.y + dy * t;

              newTrail.push({
                id: idCounter.current++,
                x: newX,
                y: newY,
                angle: computedAngle,
                ...createRandomData(),
              });
            }
          }
        }

        if (newTrail.length > maxPoints) {
          return newTrail.slice(newTrail.length - maxPoints);
        }

        return newTrail;
      });

      lastMoveTimeRef.current = Date.now();
    },
    [followMouseDirection, maxPoints, randomFloat, spacing],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Date.now() - lastMoveTimeRef.current > 100) {
        setTrail(prev => (prev.length > 0 ? prev.slice(1) : prev));
      }
    }, removalInterval);

    return () => window.clearInterval(interval);
  }, [removalInterval]);

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.inner}>
        <AnimatePresence>
          {trail.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 1, rotate: item.angle }}
              animate={{
                opacity: 1,
                scale: 1,
                x: randomFloat ? [0, item.randomX || 0, 0] : 0,
                y: randomFloat ? [0, item.randomY || 0, 0] : 0,
                rotate: randomFloat
                  ? [item.angle, item.angle + (item.randomRotate || 0), item.angle]
                  : item.angle,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                opacity: { duration: exitDuration, ease: 'easeOut' },
                ...(randomFloat && {
                  x: { duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' },
                  y: { duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' },
                  rotate: { duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' },
                }),
              }}
              className={styles.item}
              style={{ left: item.x, top: item.y }}
            >
              {text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TextCursor;
