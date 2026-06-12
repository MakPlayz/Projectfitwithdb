'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import styles from './page.module.css';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isManualPayment = searchParams.get('payment') === 'manual';
  
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          {isManualPayment ? (
            <MessageCircle size={64} className={styles.icon} />
          ) : (
            <CheckCircle2 size={64} className={styles.icon} />
          )}
        </div>
        
        <h1 className={styles.title}>
          {isManualPayment ? 'Order Request Created' : 'Order Confirmed!'}
        </h1>
        <p className={styles.desc}>
          {isManualPayment
            ? 'WhatsApp has opened in a separate tab. Send the pre-filled message, complete payment after receiving the QR, and share the payment screenshot there.'
            : 'Your healthy meal is being prepared by our chefs.'}
        </p>
        
        {id && (
          <div className={styles.orderId}>
            <span>Order ID</span>
            <strong>{id}</strong>
          </div>
        )}
        
        <div className={styles.actions}>
          <Link href="/menu" className="btn-secondary">
            Back to Menu
          </Link>
          <Link href="/my-plan" className="btn-primary">
            View My Plan <ArrowRight size={18} />
          </Link>
          <Link href="/chef" className="btn-primary" style={{ display: 'none' }}>
            Go to Chef Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmed() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading...</div>}>
      <OrderConfirmedContent />
    </Suspense>
  );
}
