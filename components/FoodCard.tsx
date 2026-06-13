'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { MenuItem } from '@/data/menu';
import styles from './FoodCard.module.css';

export default function FoodCard({ item }: { item: MenuItem }) {
  return (
    <motion.article
      id={item.id}
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.imageWrap}>
        {item.image.startsWith('data:image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className={styles.image} />
        ) : (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className={styles.image}
          />
        )}
        {item.badge && <span className={styles.badge}>{item.badge}</span>}
        <div className={styles.typeTag}>
          <div className={item.isVeg ? 'veg-dot' : 'nonveg-dot'} />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{item.name}</h3>
        </div>

        <p className={styles.desc}>{item.description}</p>

        <div className={styles.macros}>
          <span className={styles.macro}>{item.calories} kcal</span>
          <span className={styles.macroDots}>•</span>
          <span className={styles.macro}>{item.protein}g protein</span>
        </div>

        {item.ingredients.length > 0 && (
          <div className={styles.footer}>
            <span className={styles.ingredients}>{item.ingredients.slice(0, 3).join(', ')}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}
