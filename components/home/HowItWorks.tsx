'use client';

import { motion } from 'framer-motion';
import { trackSpotlight } from '@/lib/spotlight';
import styles from './HowItWorks.module.css';

const steps = [
  {
    step: '01',
    title: 'Choose your program',
    text: 'Pick the diet path that matches your current health goal.',
  },
  {
    step: '02',
    title: 'Pick your plan',
    text: 'Choose a day, weekly, or monthly format with the right delivery rhythm.',
  },
  {
    step: '03',
    title: 'Enjoy fresh meals',
    text: 'Chef-crafted dishes arrive fresh each day. Heat, eat, and keep moving.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">Process</p>
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            A simple flow from plan choice to daily delivery, with profile details saved for repeat orders.
          </p>
        </motion.div>

        <div className={styles.steps}>
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className={styles.step}
              onMouseMove={trackSpotlight}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <span className={styles.number}>{s.step}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
