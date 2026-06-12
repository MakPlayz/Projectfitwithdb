import type { Metadata } from 'next';
import MyPlanClient from './MyPlanClient';
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
            Track pending manual-payment orders and active meal plan dates from your account.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className="container">
          <MyPlanClient />
        </div>
      </section>
    </main>
  );
}
