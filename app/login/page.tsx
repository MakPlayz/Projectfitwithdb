import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AuthForm from '@/components/auth/AuthForm';
import styles from '@/components/auth/auth-page.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in | Project Fit',
  description: 'Sign in to your Project Fit account.',
};

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <div className={styles.decor} aria-hidden />
      <div className="container">
        <Link href="/" className={styles.back}>
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <div className={styles.leafWrap}>
          <AuthForm initialMode="login" variant="page" />
        </div>
      </div>
    </main>
  );
}
