'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, MessageCircle, ShoppingBag } from 'lucide-react';
import styles from './page.module.css';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const intent = searchParams.get('intent');
  const isManualPayment = searchParams.get('payment') === 'manual';
  const isWhatsAppCheckout = searchParams.get('whatsapp') === '1';
  const isFreeSample = searchParams.get('type') === 'sample';
  
  return (
    <div className={styles.container}>
      <div className={styles.ambient} aria-hidden />
      <div className={styles.card}>
        <span className={styles.kicker}>
          {isWhatsAppCheckout ? 'WhatsApp checkout' : isFreeSample ? 'Free sample' : 'Project Fit order'}
        </span>
        <div className={styles.iconWrap}>
          {isManualPayment ? (
            <MessageCircle size={64} className={styles.icon} />
          ) : isWhatsAppCheckout ? (
            <MessageCircle size={64} className={styles.icon} />
          ) : isFreeSample ? (
            <ShoppingBag size={64} className={styles.icon} />
          ) : (
            <CheckCircle2 size={64} className={styles.icon} />
          )}
        </div>
        
        <h1 className={styles.title}>
          {isWhatsAppCheckout
            ? 'Send the WhatsApp message'
            : isManualPayment
              ? 'Order Request Created'
              : isFreeSample
                ? 'Free Sample Requested'
                : 'Order Confirmed!'}
        </h1>
        <p className={styles.desc}>
          {isWhatsAppCheckout
            ? isFreeSample
              ? 'WhatsApp has opened with your checkout code. Your free sample request will appear for chef approval only after you send that message.'
              : 'WhatsApp has opened with your checkout code. Your order will be created only after you send that message.'
            : isManualPayment
            ? 'WhatsApp has opened in a separate tab. Send the pre-filled message, complete payment after receiving the QR, and share the payment screenshot there.'
            : isFreeSample
              ? 'Your free sample request is waiting for chef approval. You can track it from My Plan.'
              : 'Your healthy meal is being prepared by our chefs.'}
        </p>
        
        {intent && (
          <div className={styles.orderId}>
            <span>Checkout Code</span>
            <strong>{intent}</strong>
          </div>
        )}

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
