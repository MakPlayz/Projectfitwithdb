'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <CheckCircle2 size={64} className={styles.icon} />
        </div>
        
        <h1 className={styles.title}>Order Confirmed!</h1>
        <p className={styles.desc}>
          Your healthy meal is being prepared by our chefs.
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
