'use client';

import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { MenuItem } from '@/data/menu';
import { useCartStore } from '@/store/cartStore';
import styles from './CustomizeModal.module.css';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export default function CustomizeModal({ item, onClose }: Props) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [addons, setAddons] = useState<{name: string, price: number}[]>([]);
  const [qty, setQty] = useState(1);
  const { addItem, toggleCart } = useCartStore();

  const toggleRemove = (ingredient: string) => {
    setRemoved(prev => 
      prev.includes(ingredient) ? prev.filter(i => i !== ingredient) : [...prev, ingredient]
    );
  };

  const toggleAddon = (addon: {name: string, price: number}) => {
    setAddons(prev => {
      const exists = prev.find(a => a.name === addon.name);
      return exists ? prev.filter(a => a.name !== addon.name) : [...prev, addon];
    });
  };

  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
  const singlePrice = item.price + addonsTotal;
  const totalPrice = singlePrice * qty;

  const handleAdd = () => {
    addItem({
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      basePrice: item.price,
      quantity: qty,
      image: item.image,
      removedIngredients: removed,
      addOns: addons,
      totalPrice
    });
    onClose();
    toggleCart(); // Open cart to show item added
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        
        <div className={styles.header}>
          <h2>Customize {item.name}</h2>
        </div>

        <div className={styles.scroll}>
          <div className={styles.section}>
            <h3>Remove Ingredients</h3>
            <p className={styles.hint}>Deselect any ingredients you don&apos;t want</p>
            <div className={styles.list}>
              {item.ingredients.map(ing => (
                <label key={ing} className={`${styles.item} ${removed.includes(ing) ? styles.removed : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={!removed.includes(ing)}
                    onChange={() => toggleRemove(ing)}
                  />
                  <span>{ing}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Add-ons</h3>
            <p className={styles.hint}>Boost your meal</p>
            <div className={styles.list}>
              {item.addOns.map(addon => {
                const isSelected = addons.some(a => a.name === addon.name);
                return (
                  <label key={addon.name} className={`${styles.item} ${isSelected ? styles.selected : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleAddon(addon)}
                    />
                    <div className={styles.addonInfo}>
                      <span>{addon.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.qtyCtrl}>
            <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={18} /></button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}><Plus size={18} /></button>
          </div>
          
          <button className="btn-primary" onClick={handleAdd} style={{ flex: 1, justifyContent: 'center' }}>
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
