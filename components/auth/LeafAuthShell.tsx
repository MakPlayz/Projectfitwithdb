'use client';

import { useId, type ReactNode } from 'react';
import {
  LEAF_BODY_PATH,
  LEAF_CLIP_SCALE,
  LEAF_SAFE_AREA,
  LEAF_VEIN_PATH,
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
            <path d={LEAF_BODY_PATH} transform={`scale(${LEAF_CLIP_SCALE})`} />
          </clipPath>
          <mask id={maskId} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            <path d={LEAF_BODY_PATH} transform={`scale(${LEAF_CLIP_SCALE})`} fill="white" />
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
        <path
          className={styles.leafStroke}
          d={LEAF_BODY_PATH}
        />
        <path className={styles.leafVein} d={LEAF_VEIN_PATH} />
      </svg>
    </div>
  );
}
