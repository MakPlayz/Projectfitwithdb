'use client';

import { motion } from 'framer-motion';
import styles from './BackgroundDecor.module.css';

export default function BackgroundDecor() {
  return (
    <div className={styles.wrapper} aria-hidden>
      <motion.div
        className={`${styles.blob} ${styles.blob1}`}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${styles.blob} ${styles.blob2}`}
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`${styles.blob} ${styles.blob3}`}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className={styles.grid} />
    </div>
  );
}
