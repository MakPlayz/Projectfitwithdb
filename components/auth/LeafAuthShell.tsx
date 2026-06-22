'use client';

import { useId, type ReactNode } from 'react';
import {
  LEAF_BODY_PATHS,
  LEAF_BORDER_PATHS,
  LEAF_CLIP_SCALE_X,
  LEAF_CLIP_SCALE_Y,
  LEAF_SAFE_AREA,
  LEAF_VIEWBOX,
} from './leaf-shape';
import styles from './LeafAuthShell.module.css';

interface LeafAuthShellProps {
  children: ReactNode;
  className?: string;
  tilted?: boolean;
}

export default function LeafAuthShell({
  children,
  className = '',
  tilted = false,
}: LeafAuthShellProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `leaf-clip-${uid}`;
  const maskId = `leaf-mask-${uid}`;
  const glowId = `leaf-glow-${uid}`;

  return (
    <div
      className={`${styles.shell} ${tilted ? styles.tilted : ''} ${className}`}
      data-leaf-shell
    >
      <svg className={styles.svgDefs} aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            {LEAF_BODY_PATHS.map((d, i) => (
              <path key={i} d={d} transform={`scale(${LEAF_CLIP_SCALE_X}, ${LEAF_CLIP_SCALE_Y})`} />
            ))}
          </clipPath>
          <mask id={maskId} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            {LEAF_BODY_PATHS.map((d, i) => (
              <path key={i} d={d} transform={`scale(${LEAF_CLIP_SCALE_X}, ${LEAF_CLIP_SCALE_Y})`} fill="white" />
            ))}
          </mask>
          <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div
        className={styles.content}
        style={{
          clipPath: `url(#${clipId})`,
          WebkitClipPath: `url(#${clipId})`,
          maskImage: `url(#${maskId})`,
          WebkitMaskImage: `url(#${maskId})`,
        }}
      >
        <div
          className={styles.safeArea}
          style={{
            top: LEAF_SAFE_AREA.top,
            right: LEAF_SAFE_AREA.right,
            bottom: LEAF_SAFE_AREA.bottom,
            left: LEAF_SAFE_AREA.left,
          }}
        >
          {children}
        </div>
      </div>

      <svg
        className={styles.svgBorder}
        viewBox={LEAF_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden
      >
        {LEAF_BORDER_PATHS.map((d, i) => (
          <path
            key={i}
            className={styles.leafStroke}
            d={d}
          />
        ))}
      </svg>
    </div>
  );
}
