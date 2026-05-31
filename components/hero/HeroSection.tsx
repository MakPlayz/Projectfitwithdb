'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AnimatedMarqueeHero } from '@/components/ui/hero-3';
import { dietCategories } from '@/data/diets';
import DietCategoryCard from '@/components/diet/DietCategoryCard';
import styles from './HeroSection.module.css';

const heroImages = [
  '/images/preg-breakfast/breakfast-1.png',
  '/images/preg-breakfast/breakfast-2.png',
  '/images/preg-breakfast/breakfast-3.png',
  '/images/preg-breakfast/breakfast-4.png',
  '/images/preg-breakfast/breakfast-5.png',
];

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <AnimatedMarqueeHero
        tagline={
          <>
            <Sparkles size={14} />
            Weekly and Monthly plans only
          </>
        }
        title="Project Fit"
        description="Personalized diet programs delivered fresh. Choose your path from weight loss to diabetes-friendly nutrition, crafted by experts and powered by data."
        ctaText="Explore Programs"
        ctaHref="#programs"
        secondaryCtaText="How It Works"
        secondaryCtaHref="#how-it-works"
        images={heroImages}
      />

      <div className="container">
        <div id="programs" className={styles.cardsSection}>
          <motion.div
            className={styles.cardsHeader}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            <p className="section-label">Specialized Programs</p>
            <h2 className={styles.cardsTitle}>Your nutrition, precisely designed</h2>
          </motion.div>

          <div className={styles.cardsGrid}>
            {dietCategories.map((diet, i) => (
              <DietCategoryCard key={diet.slug} diet={diet} index={i} />
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className={styles.scrollHint}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span />
      </motion.div>
    </section>
  );
}
