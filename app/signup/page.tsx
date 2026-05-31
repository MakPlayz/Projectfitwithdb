import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AuthForm from '@/components/auth/AuthForm';
import styles from '@/components/auth/auth-page.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up | Project Fit',
  description: 'Create your Project Fit account.',
};

export default function SignupPage() {
  return (
    <main className={styles.main}>
      <div className={styles.decor} aria-hidden />
      <div className="container">
        <Link href="/" className={styles.back}>
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <div className={styles.leafWrap}>
          <AuthForm initialMode="signup" variant="page" />
        </div>
      </div>
    </main>
  );
}
