'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight, Scale, Dumbbell, Heart, Sparkles, Activity } from 'lucide-react';
import { categoryImages, type DietCategory } from '@/data/diets';
import DietImage from '@/components/ui/DietImage';
import { ensureSession } from '@/lib/auth-client';
import { buildAuthRedirect } from '@/lib/protected-routes';
import styles from './DietCategoryCard.module.css';

const icons = {
  scale: Scale,
  dumbbell: Dumbbell,
  heart: Heart,
  sparkles: Sparkles,
  activity: Activity,
} as const;

interface DietCategoryCardProps {
  diet: DietCategory;
  index: number;
}

export default function DietCategoryCard({ diet, index }: DietCategoryCardProps) {
  const Icon = icons[diet.icon as keyof typeof icons] ?? Scale;
  const categoryImage = categoryImages[diet.slug];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const tiltRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useRef(false);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  function handleTilt(event: MouseEvent<HTMLAnchorElement>) {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    if (reduceMotion.current) return;
    rotateY.set(px * 9);
    rotateX.set(-py * 9);
  }

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const session = await ensureSession();
      if (isMounted) {
        setIsAuthenticated(Boolean(session?.accessToken));
      }
    }

    loadSession();

    const onAuthChanged = () => {
      loadSession();
    };

    window.addEventListener('storage', onAuthChanged);
    window.addEventListener('projectfit-auth-changed', onAuthChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', onAuthChanged);
      window.removeEventListener('projectfit-auth-changed', onAuthChanged);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className={styles.motionWrap}
      style={{ perspective: 1000 }}
    >
      <motion.div className={styles.tilt} style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
      <Link
        ref={tiltRef}
        href={isAuthenticated ? diet.href : buildAuthRedirect(diet.href)}
        className={styles.card}
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        style={
          {
            '--diet-accent': diet.accent,
            '--diet-accent-light': diet.accentLight,
            '--diet-gradient': diet.gradient,
          } as React.CSSProperties
        }
      >
        <div className={styles.imageArea}>
          <DietImage src={categoryImage} alt={diet.title} sizes="(max-width: 768px) 280px, 320px" />
          <div className={styles.imageOverlay} />
          <span className={styles.iconBadge}>
            <Icon size={18} strokeWidth={2.25} />
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.topRow}>
            <h3>{diet.shortTitle}</h3>
            <span className={styles.arrow}>
              <ArrowUpRight size={18} />
            </span>
          </div>
          <p>{diet.tagline}</p>
          <span className={styles.calorieBadge}>{diet.calorieTarget}</span>
        </div>

        <div className={styles.shine} aria-hidden />
      </Link>
      </motion.div>
    </motion.div>
  );
}
