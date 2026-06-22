'use client';

import { motion } from 'framer-motion';
import { Sprout, Truck, BarChart3, Shield } from 'lucide-react';
import { trackSpotlight } from '@/lib/spotlight';
import styles from './FeaturesSection.module.css';

const features = [
  {
    icon: Sprout,
    title: 'Fresh Farm Procurement',
    description:
      'Fresh farm vegetables, branded oats and quinoa, farm-sourced milk, and house-prepared yogurt always.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Macros',
    description: 'Every meal labeled with calories, protein, carbs, and fats - no guesswork.',
  },
  {
    icon: Truck,
    title: 'Fresh Daily Delivery',
    description: 'Chef-prepared meals delivered chilled, ready to heat and enjoy in minutes.',
  },
  {
    icon: Shield,
    title: 'Expert-Backed Nutrition',
    description: 'Programs designed around clinical guidelines for each specialized diet path.',
  },
];

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">Why ProjectFit</p>
          <h2 className="section-title">Nutrition that feels premium</h2>
          <p className="section-subtitle">
            Carefully sourced ingredients, transparent macros, and doorstep delivery for everyday healthy eating.
          </p>
        </motion.div>

        <div className={styles.grid}>
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              className={styles.card}
              onMouseMove={trackSpotlight}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -5 }}
            >
              <div className={styles.iconWrap}>
                <f.icon size={22} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
