'use client';

import { motion } from 'framer-motion';
import { Brain, Truck, BarChart3, Shield } from 'lucide-react';
import styles from './FeaturesSection.module.css';

const features = [
  {
    icon: Brain,
    title: 'AI-Personalized Plans',
    description: 'Smart recommendations adapt to your goals, preferences, and progress over time.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Macros',
    description: 'Every meal labeled with calories, protein, carbs, and fats — no guesswork.',
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
        <div className={styles.header}>
          <p className="section-label">Why ProjectFit</p>
          <h2 className="section-title">Nutrition that feels premium</h2>
          <p className="section-subtitle">
            A modern health-tech experience — from personalized plans to doorstep delivery.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
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
