'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import styles from '@/components/auth/auth-page.module.css';
import formStyles from '@/components/auth/AuthForm.module.css';

function getHashToken() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('access_token') ?? '';
}

export default function ResetPasswordClient() {
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = useMemo(() => Boolean(accessToken), [accessToken]);

  useEffect(() => {
    setAccessToken(getHashToken());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('');

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not update password.');
      }

      window.history.replaceState(null, '', '/reset-password');
      setStatus('Password updated. You can sign in with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.decor} aria-hidden />
      <div className="container">
        <Link href="/login" className={styles.back}>
          <ArrowLeft size={18} />
          Back to sign in
        </Link>

        <div className={formStyles.wrap}>
          <h1 className={formStyles.title}>Reset password</h1>
          <p className={formStyles.subtitle}>Create a new password for your Project Fit account.</p>

          {!canSubmit && !status && (
            <p className={formStyles.error}>
              This reset link is missing or expired. Request a fresh link from the sign-in page.
            </p>
          )}

          <form className={formStyles.form} onSubmit={handleSubmit}>
            <label className={formStyles.field}>
              <Lock size={16} />
              <input
                type="password"
                name="password"
                placeholder="New password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!canSubmit || Boolean(status)}
              />
            </label>
            <label className={formStyles.field}>
              <Lock size={16} />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!canSubmit || Boolean(status)}
              />
            </label>

            {error && <p className={formStyles.error}>{error}</p>}
            {status && <p className={formStyles.success}>{status}</p>}

            <button type="submit" className={`btn-primary ${formStyles.submitBtn}`} disabled={!canSubmit || isSubmitting || Boolean(status)}>
              {isSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
