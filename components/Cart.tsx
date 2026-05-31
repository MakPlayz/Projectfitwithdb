'use client';

import { useCartStore } from '@/store/cartStore';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getAuthHeaders } from '@/lib/auth-client';
import styles from './Cart.module.css';

export default function Cart() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const total = getTotal();

  const handleCheckout = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          items,
          subtotal: total,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not place your order.');
      }

      clearCart();
      toggleCart();
      router.push(`/order-confirmed?id=${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={toggleCart}>
      <div className={styles.cart} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button className={styles.closeBtn} onClick={toggleCart}><X size={24} /></button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <ShoppingBag size={48} className={styles.emptyIcon} />
            <h3>Cart is empty</h3>
            <p>Looks like you haven't added anything yet.</p>
            <button className="btn-primary" onClick={toggleCart}>Browse Menu</button>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitle}>
                      <h4>{item.name}</h4>
                      <p className={styles.price}>₹{item.totalPrice}</p>
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.removedIngredients.length > 0 && (
                    <div className={styles.customizations}>
                      <p className={styles.removed}>
                        No {item.removedIngredients.join(', ')}
                      </p>
                    </div>
                  )}

                  {item.addOns.length > 0 && (
                    <div className={styles.customizations}>
                      {item.addOns.map(addon => (
                        <p key={addon.name} className={styles.added}>
                          + {addon.name} (₹{addon.price})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className={styles.qtyCtrl}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.summaryrow}>
                <span>Subtotal</span>
                <span>₹{total}</span>
              </div>
              <div className={styles.summaryrow}>
                <span>Taxes & Fees</span>
                <span>₹{Math.round(total * 0.05)}</span>
              </div>
              <div className={`${styles.summaryrow} ${styles.total}`}>
                <span>Total</span>
                <span>₹{total + Math.round(total * 0.05)}</span>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} onClick={handleCheckout} disabled={isSubmitting}>
                {isSubmitting ? 'Placing order...' : 'Place Order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
