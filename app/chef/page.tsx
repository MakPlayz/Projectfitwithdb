'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { clearChefSession, getAccessTokenExpiry, getChefAuthHeaders, getChefSession, saveChefSession } from '@/lib/auth-client';
import styles from './page.module.css';

function ChefLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function redirectIfChef() {
      if (!getChefSession()) return;

      const response = await fetch('/api/admin/me', {
        cache: 'no-store',
        headers: await getChefAuthHeaders(),
      });

      if (cancelled) return;

      if (response.ok) {
        router.replace('/chef/dashboard');
      }
    }

    redirectIfChef().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Authentication failed.');
      }

      if (!data.access_token || !data.user) {
        throw new Error('Invalid authentication response.');
      }

      saveChefSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: getAccessTokenExpiry(data.access_token),
        user: data.user,
      });

      const adminCheck = await fetch('/api/admin/me', {
        cache: 'no-store',
        headers: await getChefAuthHeaders(),
      });

      if (!adminCheck.ok) {
        clearChefSession();
        const adminData = await adminCheck.json().catch(() => ({}));
        throw new Error(adminData.error ?? 'This account is not allowed to access the chef portal.');
      }

      router.push('/chef/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <span className={styles.mark}>PF</span>
          <span>Kitchen Console</span>
        </div>
        <div className={styles.brandCopy}>
          <p>Chef Portal</p>
          <h1>Review orders, confirm payments, and manage plan operations.</h1>
        </div>
        <div className={styles.signalGrid}>
          <div>
            <ShieldCheck size={18} />
            <span>Admin allow-list</span>
          </div>
          <div>
            <LockKeyhole size={18} />
            <span>Password protected</span>
          </div>
        </div>
      </section>

      <section className={styles.authPanel}>
        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.formHeader}>
            <p>Secure Access</p>
            <h2>Sign in to chef portal</h2>
            <span>Use the chef account created with the approved admin email.</span>
          </div>

          {searchParams.get('confirmed') === '1' && (
            <div className={styles.success}>Email confirmed. Sign in to continue.</div>
          )}

          <label>
            <span>Email address</span>
            <input
              type="email"
              placeholder="chef@projectfitvizag.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              required
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
            />
          </label>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Open dashboard'}
            <ArrowRight size={17} />
          </button>

          <div className={styles.switchLine}>
            Chef account not created?
            <Link href="/chef/signup">Create chef access</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function ChefLogin() {
  return (
    <Suspense fallback={<main className={styles.shell} />}>
      <ChefLoginContent />
    </Suspense>
  );
}
