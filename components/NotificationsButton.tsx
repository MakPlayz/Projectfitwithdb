'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth-client';
import type { ApiOrder } from '@/lib/backend-types';
import styles from './NotificationsButton.module.css';

function formatDate(value: string | null | undefined) {
  if (!value) return 'soon';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export default function NotificationsButton() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const response = await fetch('/api/my-plan', {
        cache: 'no-store',
        headers: await getAuthHeaders(),
      });

      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setOrders(data.orders ?? []);
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const notifications = useMemo(
    () =>
      orders
        .filter((order) => order.payment_stage === 'half_paid' && order.remaining_payment_amount > 0)
        .map((order) => ({
          id: order.id,
          text: `Remaining payment of Rs ${order.remaining_payment_amount.toLocaleString('en-IN')} for ${order.items[0]?.name ?? 'your plan'} is due on ${formatDate(order.remaining_payment_due_at)}.`,
        })),
    [orders]
  );

  if (notifications.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {isOpen && (
        <section className={styles.panel}>
          <strong>Notifications</strong>
          {notifications.map((item) => (
            <p key={item.id}>{item.text}</p>
          ))}
        </section>
      )}
      <button type="button" className={styles.button} onClick={() => setIsOpen((current) => !current)} aria-label="Notifications">
        <Bell size={20} />
        <span>{notifications.length}</span>
      </button>
    </div>
  );
}
