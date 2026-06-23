'use client';\n\nimport { motion } from 'framer-motion';\nimport { Sparkles } from 'lucide-react';\nimport { AnimatedMarqueeHero } from '@/components/ui/hero-3';\nimport { dietCategories } from '@/data/diets';
import DietCategoryCard from '@/components/diet/DietCategoryCard';
import HomepageAdsBoard from '@/components/home/HomepageAdsBoard';
import styles from './HeroSection.module.css';
\nconst heroImages = [\n  '/images/preg-breakfast/breakfast-1.png',\n  '/images/preg-breakfast/breakfast-2.png',\n  '/images/preg-breakfast/breakfast-3.png',\n  '/images/preg-breakfast/breakfast-4.png',\n  '/images/preg-breakfast/breakfast-5.png',\n];\n\nexport default function HeroSection() {\n  return (\n    <section className={styles.hero}>\n      <AnimatedMarqueeHero\n        tagline={\n          <>\n            <Sparkles size={14} />\n            Fresh daily, weekly, and monthly plans
          </>\n        }\n        title="Project Fit"\n        description="Fresh diet programs for real routines. Choose your path from weight loss to diabetes-friendly nutrition, then let the kitchen handle the daily work."
        ctaText="Explore Programs"\n        ctaHref="#programs"\n        secondaryCtaText="How It Works"\n        secondaryCtaHref="#how-it-works"\n        images={heroImages}\n      />\n\n      <div className="container">
        <HomepageAdsBoard />

        <div id="programs" className={styles.cardsSection}>
          <motion.div\n            className={styles.cardsHeader}\n            initial={{ opacity: 0 }}\n            animate={{ opacity: 1 }}\n            transition={{ delay: 0.35, duration: 0.6 }}\n          >\n            <p className="section-label">Specialized Programs</p>\n            <h2 className={styles.cardsTitle}>Your nutrition, precisely designed</h2>\n          </motion.div>\n\n          <div className={styles.cardsGrid}>\n            {dietCategories.map((diet, i) => (\n              <DietCategoryCard key={diet.slug} diet={diet} index={i} />\n            ))}\n          </div>\n        </div>\n      </div>\n\n    </section>
  );
}
