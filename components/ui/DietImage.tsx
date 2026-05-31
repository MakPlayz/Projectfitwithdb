'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './DietImage.module.css';

const FALLBACK = '/images/categories/weightloss.png';

interface DietImageProps {
  src: string;
  alt: string;
  /** Replace with your asset path when ready */
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
}

/**
 * Reusable diet/meal image — swap `src` in diet data without touching layout code.
 */
export default function DietImage({
  src,
  alt,
  priority = false,
  fill = true,
  width,
  height,
  className = '',
  sizes = '(max-width: 768px) 100vw, 400px',
}: DietImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${styles.image} ${className}`}
        onError={() => setImgSrc(FALLBACK)}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width ?? 400}
      height={height ?? 300}
      priority={priority}
      className={`${styles.image} ${className}`}
      onError={() => setImgSrc(FALLBACK)}
    />
  );
}
