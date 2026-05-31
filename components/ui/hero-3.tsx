'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import CircularGallery from '@/components/ui/CircularGallery/CircularGallery';
import SplitText from '@/components/ui/SplitText';
import { cn } from '@/lib/utils';
import splitTextStyles from '@/components/ui/SplitText.module.css';
import styles from './hero-3.module.css';

interface AnimatedMarqueeHeroProps {
  tagline: React.ReactNode;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  images: string[];
  className?: string;
}

const fadeInAnimationVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
};

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  ctaHref = '#programs',
  secondaryCtaText,
  secondaryCtaHref,
  images,
  className,
}) => {
  const galleryItems = images.map((image, index) => ({
    image,
    text: '',
  }));

  return (
    <section className={cn(styles.hero, className)}>
      <div className={styles.content}>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeInAnimationVariants}
          className={styles.tagline}
        >
          {tagline}
        </motion.div>

        <h1 className={styles.title} aria-label={typeof title === 'string' ? title : undefined}>
          {typeof title === 'string' ? (
            <SplitText
              text={title}
              tag="span"
              className={splitTextStyles.heroTitle}
              delay={70}
              duration={0.75}
              ease="power3.out"
              splitType="words, chars"
              from={{ opacity: 0, y: 42, rotateX: -75, filter: 'blur(8px)' }}
              to={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          ) : (
            title
          )}
        </h1>

        <motion.p
          initial="hidden"
          animate="show"
          variants={fadeInAnimationVariants}
          transition={{ delay: 0.5 }}
          className={styles.description}
        >
          {description}
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeInAnimationVariants}
          transition={{ delay: 0.6 }}
          className={styles.actions}
        >
          <Link href={ctaHref} className="btn-primary">
            {ctaText}
            <ArrowRight size={18} />
          </Link>
          {secondaryCtaText && secondaryCtaHref ? (
            <Link href={secondaryCtaHref} className="btn-secondary">
              {secondaryCtaText}
            </Link>
          ) : null}
        </motion.div>
      </div>

      <div className={styles.galleryWrap} aria-label="Fresh breakfast gallery">
        <CircularGallery
          items={galleryItems}
          bend={1}
          textColor="#047857"
          borderRadius={0.06}
          scrollSpeed={2}
          scrollEase={0.05}
          font="bold 30px Poppins"
        />
      </div>
    </section>
  );
};
