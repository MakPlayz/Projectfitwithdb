'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Plus } from 'lucide-react';
import { MenuItem } from '@/data/menu';
import CustomizeModal from './CustomizeModal';
import styles from './FoodCard.module.css';
import { motion } from 'framer-motion';

export default function FoodCard({ item }: { item: MenuItem }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.article
        id={item.id}
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.imageWrap}>
          <Image 
            src={item.image} 
            alt={item.name} 
            fill 
            className={styles.image} 
            onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop'; }}
          />
          {item.badge && <span className={styles.badge}>{item.badge}</span>}
          <div className={styles.typeTag}>
            <div className={item.isVeg ? 'veg-dot' : 'nonveg-dot'} />
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.title}>{item.name}</h3>
            <div className={styles.rating}>
              <Star size={14} fill="currentColor" />
              <span>{item.rating}</span>
            </div>
          </div>
          
          <p className={styles.desc}>{item.description}</p>
          
          <div className={styles.macros}>
            <span className={styles.macro}>{item.calories} kcal</span>
            <span className={styles.macroDots}>•</span>
            <span className={styles.macro}>{item.protein}g protein</span>
          </div>

          <div className={styles.footer}>
            <span className={styles.price}>₹{item.price}</span>
            <button 
              className={styles.addBtn}
              onClick={() => setShowModal(true)}
            >
              Add <Plus size={16} />
            </button>
          </div>
        </div>
      </motion.article>

      {showModal && (
        <CustomizeModal item={item} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
