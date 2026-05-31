'use client';

import { useState, useMemo } from 'react';
import { Leaf, ArrowDown, ArrowUp } from 'lucide-react';
import FoodCard from '@/components/FoodCard';
import { menuData, categories } from '@/data/menu';
import styles from './page.module.css';

type SortOption = 'popular' | 'price-low' | 'price-high';

export default function MenuPage() {
  const [activeCat, setActiveCat] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [highProtein, setHighProtein] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const filteredMenu = useMemo(() => {
    let result = menuData;

    if (activeCat !== 'All') {
      result = result.filter(item => item.category === activeCat);
    }
    if (vegOnly) result = result.filter(item => item.isVeg);
    if (nonVegOnly) result = result.filter(item => !item.isVeg);
    if (highProtein) result = result.filter(item => item.isHighProtein);

    result = [...result].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return b.rating - a.rating; // default popular
    });

    return result;
  }, [activeCat, vegOnly, nonVegOnly, highProtein, sortBy]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Our Menu</h1>
          <p className={styles.subtitle}>Fuel your body with macros that matter.</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className={styles.categories}>
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`${styles.catBtn} ${activeCat === cat ? styles.active : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.toggles}>
            <div className={styles.toggleGroup}>
              <label className={`${styles.toggle} ${vegOnly ? styles.active : ''}`}>
                <input 
                  type="checkbox" 
                  checked={vegOnly} 
                  onChange={(e) => {
                    setVegOnly(e.target.checked);
                    if (e.target.checked) setNonVegOnly(false);
                  }} 
                />
                <div className="veg-dot" />
                Veg Only
              </label>

              <label className={`${styles.toggle} ${nonVegOnly ? styles.active : ''}`}>
                <input 
                  type="checkbox" 
                  checked={nonVegOnly} 
                  onChange={(e) => {
                    setNonVegOnly(e.target.checked);
                    if (e.target.checked) setVegOnly(false);
                  }} 
                />
                <div className="nonveg-dot" />
                Non-Veg Only
              </label>

              <label className={`${styles.toggle} ${styles.proteinToggle} ${highProtein ? styles.active : ''}`}>
                <input 
                  type="checkbox" 
                  checked={highProtein} 
                  onChange={(e) => setHighProtein(e.target.checked)} 
                />
                <Leaf size={14} />
                High Protein
              </label>
            </div>

            <div className={styles.sort}>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.select}
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      <div className="container">
        {filteredMenu.length === 0 ? (
          <div className={styles.empty}>
            <h3>No items found</h3>
            <p>Try adjusting your filters to see more options.</p>
            <button className="btn-secondary" onClick={() => {
              setVegOnly(false); setNonVegOnly(false); setHighProtein(false); setActiveCat('All');
            }}>Clear Filters</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredMenu.map(item => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
