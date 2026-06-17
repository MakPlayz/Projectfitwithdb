'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CreditCard, Sparkles, Soup } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth-client';
import type { ApiOrder } from '@/lib/backend-types';
import { getOrderServiceDaysRemaining } from '@/lib/plan-duration';
import styles from './page.module.css';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPlanName(order: ApiOrder) {
  return order.items[0]?.name ?? 'Meal plan';
}

function getOrderLabel(order: ApiOrder) {
  return order.order_type === 'free_sample' ? 'Free sample' : 'Meal plan';
}

function isActivePaidPlan(order: ApiOrder) {
  return (
    order.order_type !== 'free_sample' &&
    ['confirmed', 'preparing', 'ready'].includes(order.status) &&
    order.payment_status === 'paid' &&
    (!order.plan_expires_at || new Date(order.plan_expires_at) >= new Date())
  );
}

function getFreeSampleStatusText(order: ApiOrder) {
  if (order.status === 'new') return 'Your free sample order is pending chef approval.';
  if (order.status === 'cancelled') {
    const reason = getCustomerCancellationReason(order.cancellation_reason);
    return reason
      ? `Your free sample has been cancelled by the chef team due to ${reason}.`
      : 'Your free sample has been cancelled by the chef team.';
  }
  if (order.customer_delivery_status === 'received') return 'You marked this free sample as received.';
  if (order.customer_delivery_status === 'not_received') return 'You marked this free sample as not received. The kitchen team can follow up.';
  return 'Your delivery for free sample has been accepted and delivery is on the way.';
}

function getPlanHistoryStatusText(order: ApiOrder) {
  if (order.status === 'cancelled') {
    const reason = getCustomerCancellationReason(order.cancellation_reason);
    return reason
      ? `Your plan has been cancelled by the chef team due to ${reason}.`
      : 'Your plan has been cancelled by the chef team.';
  }

  if (order.plan_expires_at && new Date(order.plan_expires_at) < new Date()) {
    return 'This plan has been completed.';
  }

  return `Status: ${order.status}.`;
}

function getCustomerCancellationReason(reason: string | null | undefined) {
  const cleaned = reason?.trim().replace(/\.$/, '');
  if (!cleaned || cleaned.toLowerCase() === 'active plan cancelled by chef') return null;
  return cleaned;
}

export default function MyPlanClient() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch('/api/my-plan', {
          cache: 'no-store',
          headers: await getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? 'Could not load your plans.');
        }

        if (!cancelled) {
          setOrders(data.orders ?? []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load your plans.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  const sampleOrders = useMemo(
    () => orders.filter((order) => order.order_type === 'free_sample'),
    [orders]
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => order.order_type !== 'free_sample' && order.status === 'new'),
    [orders]
  );
  const activeOrders = useMemo(
    () => orders.filter((order) => isActivePaidPlan(order)),
    [orders]
  );
  const planHistoryOrders = useMemo(
    () => orders.filter((order) => order.order_type !== 'free_sample' && order.status !== 'new' && !isActivePaidPlan(order)),
    [orders]
  );

  if (isLoading) {
    return <div className={styles.emptyCard}>Loading your plan details...</div>;
  }

  if (error) {
    return (
      <div className={styles.emptyCard}>
        <span className={styles.badge}>Sign in required</span>
        <h2>We could not load your plan</h2>
        <p>{error}</p>
        <div className={styles.actions}>
          <Link href="/login" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  if (pendingOrders.length === 0 && activeOrders.length === 0 && planHistoryOrders.length === 0 && sampleOrders.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <div className={styles.iconWrap}>
          <Sparkles size={34} />
        </div>
        <span className={styles.badge}>No active plan</span>
        <h2>You do not have a plan yet</h2>
        <p>Your orders, samples, active plans, completed plans, and cancelled plans will appear here after you place an order.</p>
        <div className={styles.actions}>
          <Link href="/" className="btn-primary">Browse programs</Link>
          <Link href="/profile" className="btn-secondary">Update profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.planStack}>
      {pendingOrders.length > 0 && (
        <section className={styles.planPanel}>
          <span className={styles.badge}>Pending chef confirmation</span>
          <h2>Order waiting for chef confirmation</h2>
          <p>
            After you pay and send the screenshot on WhatsApp, the chef verifies your order ID,
            user ID, and transaction ID. Your meals start on the date you selected after activation.
          </p>
          <div className={styles.planGrid}>
            {pendingOrders.map((order) => (
              <article key={order.id} className={styles.planCard}>
                <CreditCard size={20} />
                <strong>{getPlanName(order)}</strong>
                <span>Type: {getOrderLabel(order)}</span>
                <span>Order ID: {order.id}</span>
                <span>Ordered on: {formatDate(order.created_at)}</span>
                <span>Requested start: {formatDate(order.requested_start_date)}</span>
                <span>Amount: Rs {order.total.toLocaleString('en-IN')}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {sampleOrders.length > 0 && (
        <section className={styles.planPanel}>
          <span className={styles.badgeSample}>One-time free sample order</span>
          <h2>Free sample delivery</h2>
          <p>
            Your sample request is reviewed by the chef team. Accepted samples will be prepared for delivery.
          </p>
          <div className={styles.planGrid}>
            {sampleOrders.map((order) => (
              <article key={order.id} className={styles.planCard}>
                <Soup size={20} />
                <strong>{getPlanName(order)}</strong>
                <span>Order ID: {order.id}</span>
                <span>Ordered on: {formatDate(order.created_at)}</span>
                <span>Status: {getFreeSampleStatusText(order)}</span>
                <span>Delivery confirmation: {order.customer_delivery_status.replace('_', ' ')}</span>
                <span>Last response: {formatDate(order.customer_delivery_confirmed_at)}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeOrders.length > 0 && (
        <section className={styles.planPanel}>
          <span className={styles.badgeActive}>Active plan</span>
          <h2>Your active orders</h2>
          <div className={styles.planGrid}>
            {activeOrders.map((order) => (
              <article key={order.id} className={styles.planCard}>
                <CalendarClock size={20} />
                <strong>{getPlanName(order)}</strong>
                <span>Type: {getOrderLabel(order)}</span>
                <span>Status: {order.status}</span>
                <span>Requested start: {formatDate(order.requested_start_date)}</span>
                <span>Start: {formatDate(order.plan_activated_at)}</span>
                <span>Expiry: {formatDate(order.plan_expires_at)}</span>
                <span>Service days left: {getOrderServiceDaysRemaining(order) ?? 'Not set'}</span>
                <span>Transaction: {order.payment_transaction_id ?? 'Verified manually'}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {planHistoryOrders.length > 0 && (
        <section className={styles.planPanel}>
          <span className={styles.badgeHistory}>Plan history</span>
          <h2>Past and cancelled plans</h2>
          <p>Completed and cancelled plan events remain visible here for your records.</p>
          <div className={styles.planGrid}>
            {planHistoryOrders.map((order) => (
              <article key={order.id} className={styles.planCard}>
                <CalendarClock size={20} />
                <strong>{getPlanName(order)}</strong>
                <span>Type: {getOrderLabel(order)}</span>
                <span>Order ID: {order.id}</span>
                <span>{getPlanHistoryStatusText(order)}</span>
                <span>Requested start: {formatDate(order.requested_start_date)}</span>
                <span>Start: {formatDate(order.plan_activated_at)}</span>
                <span>Expiry: {formatDate(order.plan_expires_at)}</span>
                <span>Transaction: {order.payment_transaction_id ?? 'Verified manually'}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
