'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { getAccessTokenExpiry, saveSession } from '@/lib/auth-client';
import styles from '../page.module.css';

export default function ChefSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/chef-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Chef signup failed.');
      }

      if (data.access_token && data.user) {
        saveSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? null,
          expiresAt: getAccessTokenExpiry(data.access_token),
          user: data.user,
        });
        router.push('/chef/dashboard');
        return;
      }

      setStatus('Chef account created. Check the email inbox if confirmation is required, then sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chef signup failed.');
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
          <p>Chef Setup</p>
          <h1>Create the single approved chef account for operations.</h1>
        </div>
        <div className={styles.signalGrid}>
          <div>
            <ShieldCheck size={18} />
            <span>Only ADMIN_EMAILS can register</span>
          </div>
        </div>
      </section>

      <section className={styles.authPanel}>
        <form className={styles.form} onSubmit={handleSignup}>
          <div className={styles.formHeader}>
            <p>Chef Access</p>
            <h2>Create chef account</h2>
            <span>The email must match the `ADMIN_EMAILS` value configured in Vercel.</span>
          </div>

          <label>
            <span>Chef name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Kitchen admin" required />
          </label>

          <label>
            <span>Approved email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="chef@projectfitvizag.com" required />
          </label>

          <label>
            <span>WhatsApp number</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile number" inputMode="tel" required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create password" required />
          </label>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <p>{error}</p>
            </div>
          )}
          {status && <div className={styles.success}>{status}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create chef access'}
            <ArrowRight size={17} />
          </button>

          <div className={styles.switchLine}>
            Already created?
            <Link href="/chef">Sign in</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
