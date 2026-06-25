'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { AnimatedMarqueeHero } from '@/components/ui/hero-3';
import { dietCategories } from '@/data/diets';
import DietCategoryCard from '@/components/diet/DietCategoryCard';
import HomepageAdsBoard from '@/components/home/HomepageAdsBoard';
import styles from './HeroSection.module.css';

const heroImages = [
  '/images/food-gallery/avocado-chicken-boiled-egg.jpg',
  '/images/food-gallery/chia-pudding.jpg',
  '/images/food-gallery/chocolate-oatmeal.jpg',
  '/images/food-gallery/fish-bowl.jpg',
  '/images/food-gallery/honey-mustard-chicken-bowl.jpg',
  '/images/food-gallery/lemon-pepper-chicken-bowl.jpg',
  '/images/food-gallery/paneer-bowl-with-quinoa.jpg',
  '/images/food-gallery/paneer-mushroom-corn-sandwich.jpg',
  '/images/food-gallery/paneer-spinach-mushroom-omelet.jpg',
  '/images/food-gallery/poha.jpg',
];

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <AnimatedMarqueeHero
        tagline={
          <>
            <Sparkles size={14} />
            Fresh daily, weekly, and monthly plans
          </>
        }
        title={
          <span className={styles.brandWordmarkShell}>
            <Image
              src="/images/heroes/project-fit-wordmark-clean.png"
              alt="Project Fit"
              width={1457}
              height={282}
              className={styles.brandWordmark}
              priority
            />
            <span className={styles.brandQuote}>Your health, our priority</span>
          </span>
        }
        description="Fresh diet programs for real routines. Choose your path from weight loss to diabetes-friendly nutrition, then let the kitchen handle the daily work."
        ctaText="Explore Programs"
        ctaHref="#programs"
        secondaryCtaText="How It Works"
        secondaryCtaHref="#how-it-works"
        images={heroImages}
      />

      <div className="container">
        <HomepageAdsBoard />

        <div id="programs" className={styles.cardsSection}>
          <motion.div
            className={styles.cardsHeader}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            <p className="section-label">Specialized Programs</p>
            <h2 className={styles.cardsTitle}>Your nutrition, precisely designed</h2>
            <p className={styles.deliveryNote}>
              Note: Plans begin the next day, so your first meal is delivered tomorrow.
            </p>
          </motion.div>

          <div className={styles.cardsGrid}>
            {dietCategories.map((diet, i) => (
              <DietCategoryCard key={diet.slug} diet={diet} index={i} />
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
