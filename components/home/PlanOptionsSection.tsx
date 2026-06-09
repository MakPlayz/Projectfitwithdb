'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, Gem, CheckCircle2 } from 'lucide-react';
import styles from './PlanOptionsSection.module.css';

const sections = [
  {
    icon: Calendar,
    title: 'Delivery Options',
    subtitle: 'Flexible delivery schedules',
    accent: 'var(--green)',
    items: [
      {
        name: '6-Day Plan',
        desc: 'Delivered Monday to Saturday (Sundays off). Perfect for staying clean during the workweek.',
      },
      {
        name: '7-Day Plan',
        desc: 'Delivered Monday to Sunday (full week). Complete daily nutrition with zero gaps.',
      },
    ],
  },
  {
    icon: Clock,
    title: 'Plan Durations',
    subtitle: 'Choose your commitment level',
    accent: 'var(--orange)',
    items: [
      {
        name: 'Day Plan',
        desc: 'A standard single-day plan. Order whenever you just need healthy meals for one day at a low entry price.',
      },
      {
        name: 'Week Plan',
        desc: 'A 6-day or 7-day subscription block to jumpstart your healthy eating habit.',
      },
      {
        name: 'Month Plan',
        desc: 'A 24-day or 28-day subscription block. Required if custom calorie/macro adjustments or dietary swaps are needed.',
        highlight: true,
      },
    ],
  },
  {
    icon: Gem,
    title: 'Pricing & Diet Tiers',
    subtitle: 'Choose your menu level',
    accent: '#7c3aed',
    items: [
      {
        name: 'Regular Tier',
        desc: 'Healthy, clean meals using quality standard proteins (chicken breast, paneer, lentils) and complex whole grains.',
      },
      {
        name: 'Premium Tier',
        desc: 'Upgraded meals packed with superfoods, premium proteins (fish, shrimp), and high-protein whey smoothie bowls.',
      },
      {
        name: 'Kids Section',
        desc: 'Highly nutritious, brain-boosting meals tailored for children, available in both Regular and Premium tiers.',
      },
    ],
  },
];

export default function PlanOptionsSection() {
  return (
    <section className={styles.section} id="pricing-options">
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Flexible Pricing</p>
          <h2 className="section-title">Designed for your lifestyle</h2>
          <p className="section-subtitle">
            Transparent delivery schedules, flexible duration blocks, and diet tiers to match your performance goals.
          </p>
        </div>

        <div className={styles.grid}>
          {sections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <motion.div
                key={sec.title}
                className={styles.card}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <div className={styles.cardHeader}>
                  <div
                    className={styles.iconWrap}
                    style={{ backgroundColor: `${sec.accent}12`, color: sec.accent }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3>{sec.title}</h3>
                    <p className={styles.cardSubtitle}>{sec.subtitle}</p>
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.itemsList}>
                  {sec.items.map((item) => (
                    <div
                      key={item.name}
                      className={`${styles.item} ${item.highlight ? styles.highlightedItem : ''}`}
                    >
                      <div className={styles.itemTitleRow}>
                        <CheckCircle2 size={16} className={styles.checkIcon} style={{ color: sec.accent }} />
                        <h4>{item.name}</h4>
                        {item.highlight && (
                          <span className={styles.badge} style={{ backgroundColor: sec.accent }}>
                            Customization
                          </span>
                        )}
                      </div>
                      <p>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
