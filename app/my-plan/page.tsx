import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, CreditCard, Sparkles } from 'lucide-react';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Plan | Project Fit',
  description: 'View your active Project Fit nutrition plan.',
};

export default function MyPlanPage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className="container">
          <p className="section-label">My Plan</p>
          <h1>Your nutrition plan</h1>
          <p>
            Once payments and subscriptions are connected, this page will show your active plan,
            meals, delivery schedule, and renewal details.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <div className={styles.emptyCard}>
            <div className={styles.iconWrap}>
              <Sparkles size={34} />
            </div>
            <span className={styles.badge}>No active plan</span>
            <h2>You do not have a plan yet</h2>
            <p>
              Your purchased plans will appear here after checkout is enabled. For now, you can
              explore the available nutrition programs and choose what fits your goals.
            </p>
            <div className={styles.featureGrid}>
              <div>
                <CalendarClock size={20} />
                <strong>Plan schedule</strong>
                <span>Coming after subscription setup</span>
              </div>
              <div>
                <CreditCard size={20} />
                <strong>Payment status</strong>
                <span>Coming after gateway integration</span>
              </div>
            </div>
            <div className={styles.actions}>
              <Link href="/" className="btn-primary">
                Browse programs
              </Link>
              <Link href="/profile" className="btn-secondary">
                Update profile
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
