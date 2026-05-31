'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Scale, Dumbbell, Heart, Sparkles, Activity } from 'lucide-react';
import { categoryImages, type DietCategory } from '@/data/diets';
import DietImage from '@/components/ui/DietImage';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className={styles.motionWrap}
    >
      <Link
        href={diet.href}
        className={styles.card}
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
  );
}
