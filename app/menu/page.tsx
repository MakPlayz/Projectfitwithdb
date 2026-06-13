'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Leaf } from 'lucide-react';
import FoodCard from '@/components/FoodCard';
import type { MenuItem as FoodMenuItem } from '@/data/menu';
import { getAuthHeaders } from '@/lib/auth-client';
import type { CustomerProfile, MenuItem } from '@/lib/backend-types';
import styles from './page.module.css';

type SortOption = 'category' | 'price-low' | 'price-high';

function resolveMenuImage(value: string | null | undefined) {
  if (value?.startsWith('/') || value?.startsWith('data:image/')) {
    return value;
  }

  return '/images/projectfit-logo.png';
}

export default function MenuPage() {
  const [activeCat, setActiveCat] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [highProtein, setHighProtein] = useState(false);
  const [sortBy] = useState<SortOption>('category');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [menuItems, setMenuItems] = useState<FoodMenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)))],
    [menuItems]
  );
  const hasMenuItems = menuItems.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch('/api/profile', {
          headers: {
            ...(await getAuthHeaders()),
          },
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        if (isMounted) {
          setProfile(data.profile ?? null);
        }
      } catch {
        // Menu still works without a profile, so keep this silent.
      }
    }

    loadProfile();

    async function loadMenu() {
      try {
        const response = await fetch('/api/menu-items', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? 'Could not load menu items.');
        }

        const mappedItems = (data.menuItems ?? []).map((item: MenuItem): FoodMenuItem => ({
          id: item.id,
          name: item.name,
          description: item.description ?? (item.ingredients.join(', ') || 'Chef prepared meal.'),
          price: 0,
          image: resolveMenuImage(item.photo_url),
          category: item.category,
          isVeg: !/chicken|fish|egg|prawn|shrimp|meat/i.test(`${item.name} ${item.description ?? ''} ${item.ingredients.join(' ')}`),
          isHighProtein: Number(item.protein_grams ?? 0) >= 20,
          calories: 0,
          protein: Math.round(Number(item.protein_grams ?? 0)),
          carbs: 0,
          ingredients: item.ingredients,
          addOns: [],
          badge: item.program_slug === 'main' ? undefined : item.program_slug.replace('-', ' '),
        }));

        if (isMounted) {
          setMenuItems(mappedItems);
          setMenuError('');
        }
      } catch (err) {
        if (isMounted) {
          setMenuError(err instanceof Error ? err.message : 'Could not load menu items.');
        }
      } finally {
        if (isMounted) setIsMenuLoading(false);
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMenu = useMemo(() => {
    let result = menuItems;

    if (activeCat !== 'All') {
      result = result.filter(item => item.category === activeCat);
    }
    if (vegOnly) result = result.filter(item => item.isVeg);
    if (nonVegOnly) result = result.filter(item => !item.isVeg);
    if (highProtein) result = result.filter(item => item.isHighProtein);

    result = [...result].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    });

    return result;
  }, [activeCat, vegOnly, nonVegOnly, highProtein, sortBy, menuItems]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>Our Menu</h1>
          <p className={styles.subtitle}>Fuel your body with macros that matter.</p>
          {profile?.is_profile_complete && (
            <div className={styles.recommendationCard}>
              <div>
                <span className="tag">Personalized plan</span>
                <h2>Recommended path: {profile.recommended_path.replace('-', ' ')}</h2>
                <p>{profile.recommendation_summary}</p>
              </div>
              <Link href="/onboarding" className="btn-secondary">
                Update profile
              </Link>
            </div>
          )}
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
          </div>
        </div>
      </div>

      <div className="container">
        {isMenuLoading ? (
          <div className={styles.empty}>
            <h3>Loading menu</h3>
            <p>Fetching the latest chef-approved items.</p>
          </div>
        ) : menuError ? (
          <div className={styles.empty}>
            <h3>Menu unavailable</h3>
            <p>{menuError}</p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className={styles.empty}>
            <h3>{hasMenuItems ? 'No items found' : 'No menu options added yet'}</h3>
            <p>
              {hasMenuItems
                ? 'Try adjusting your filters to see more options.'
                : 'New menu options can be added here when they are ready.'}
            </p>
            {hasMenuItems && (
              <button className="btn-secondary" onClick={() => {
                setVegOnly(false); setNonVegOnly(false); setHighProtein(false); setActiveCat('All');
              }}>Clear Filters</button>
            )}
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
