'use client';

import { motion } from 'framer-motion';
import styles from './HowItWorks.module.css';

const steps = [
  { step: '01', title: 'Choose your program', text: 'Select from five specialized diet paths tailored to your health goals.' },
  { step: '02', title: 'Pick your plan', text: 'Flexible weekly or monthly plans with transparent pricing and macros.' },
  { step: '03', title: 'Enjoy fresh meals', text: 'Chef-crafted dishes delivered daily — heat, eat, and track your progress.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Process</p>
          <h2 className="section-title">How it works</h2>
        </div>

        <div className={styles.steps}>
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className={styles.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
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
