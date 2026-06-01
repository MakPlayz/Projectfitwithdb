'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiOrder, ApiOrderStatus } from '@/lib/backend-types';
import { Clock, CheckCircle2, CircleDashed } from 'lucide-react';
import styles from './page.module.css';

export default function ChefDashboard() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not load orders.');
      }

      setOrders(data.orders);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(loadOrders, 5000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (orderId: string, status: ApiOrderStatus) => {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? 'Could not update order status.');
      return;
    }

    setOrders((current) =>
      current.map((order) => (order.id === orderId ? data.order : order))
    );
  };

  const getStatusIcon = (status: ApiOrderStatus) => {
    switch (status) {
      case 'new': return <CircleDashed size={18} className={styles.statusNew} />;
      case 'preparing': return <Clock size={18} className={styles.statusPrep} />;
      case 'ready': return <CheckCircle2 size={18} className={styles.statusReady} />;
    }
  };

  const getStatusBtn = (status: ApiOrderStatus, id: string) => {
    switch (status) {
      case 'new':
        return <button className={styles.actionBtn} onClick={() => updateStatus(id, 'preparing')}>Start Preparing</button>;
      case 'preparing':
        return <button className={`${styles.actionBtn} ${styles.btnReady}`} onClick={() => updateStatus(id, 'ready')}>Mark Ready</button>;
      case 'ready':
        return <span className={styles.readyText}>Order Completed</span>;
    }
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Kitchen Dashboard</h1>
            <p>Live order stream</p>
          </div>
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span>New</span>
              <strong>{orders.filter(o => o.status === 'new').length}</strong>
            </div>
            <div className={styles.statBox}>
              <span>Preparing</span>
              <strong>{orders.filter(o => o.status === 'preparing').length}</strong>
            </div>
            <div className={styles.statBox}>
              <span>Profiles</span>
              <strong>{orders.filter(o => o.customer_profile?.is_profile_complete).length}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '40px 24px' }}>
        {error && <p className={styles.error}>{error}</p>}
        {isLoading ? (
          <div className={styles.empty}>
            <h2>Loading orders</h2>
            <p>Checking the kitchen stream...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <h2>Kitchen is quiet</h2>
            <p>Waiting for new orders to arrive...</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {orders.map(order => (
              <div key={order.id} className={`${styles.card} ${styles[`card-${order.status}`]}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.orderInfo}>
                    <h3>#{order.id}</h3>
                    <span className={styles.time}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.statusBadge}>
                    {getStatusIcon(order.status)}
                    <span style={{ textTransform: 'capitalize' }}>{order.status}</span>
                  </div>
                </div>

                <div className={styles.itemsList}>
                  {order.customer_name && (
                    <div className={styles.item}>
                      <div className={styles.itemHeader}>
                        <span className={styles.name}>{order.customer_name}</span>
                      </div>
                    </div>
                  )}

                  {order.customer_profile && (
                    <div className={styles.profilePanel}>
                      <div className={styles.profileTags}>
                        <span className={styles.profileTag}>{order.customer_profile.primary_goal}</span>
                        <span className={styles.profileTag}>{order.customer_profile.health_focus}</span>
                        <span className={styles.profileTag}>{order.customer_profile.diet_preference}</span>
                      </div>
                      <p className={styles.profileSummary}>
                        {order.customer_profile.recommendation_summary}
                      </p>
                      {order.customer_profile.allergies.length > 0 && (
                        <p className={styles.profileAlert}>
                          Allergies: {order.customer_profile.allergies.join(', ')}
                        </p>
                      )}
                      {order.customer_profile.health_notes && (
                        <p className={styles.profileMeta}>{order.customer_profile.health_notes}</p>
                      )}
                    </div>
                  )}

                  {order.items.map((item, idx) => (
                    <div key={idx} className={styles.item}>
                      <div className={styles.itemHeader}>
                        <span className={styles.qty}>{item.quantity}x</span>
                        <span className={styles.name}>{item.name}</span>
                      </div>

                      {(item.removedIngredients.length > 0 || item.addOns.length > 0) && (
                        <div className={styles.customizations}>
                          {item.removedIngredients.length > 0 && (
                            <p className={styles.removed}>
                              - NO {item.removedIngredients.join(', ')}
                            </p>
                          )}
                          {item.addOns.length > 0 && (
                            <p className={styles.added}>
                              + ADD {item.addOns.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className={styles.cardFooter}>
                  <strong className={styles.total}>Rs. {order.total}</strong>
                  {getStatusBtn(order.status, order.id)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
