'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Mail, Lock, User } from 'lucide-react';
import { saveSession } from '@/lib/auth-client';
import styles from './AuthForm.module.css';

export type AuthMode = 'login' | 'signup';
export type AuthFormVariant = 'modal' | 'page' | 'leaf';

interface AuthFormProps {
  initialMode?: AuthMode;
  variant?: AuthFormVariant;
  onSuccess?: () => void;
}

export default function AuthForm({
  initialMode = 'login',
  variant = 'modal',
  onSuccess,
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLeaf = variant === 'leaf' || variant === 'modal';
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'Authentication failed.');
      }

      if (!data.access_token || !data.user) {
        throw new Error('Please check your email to confirm your account, then log in.');
      }

      saveSession({
        accessToken: data.access_token,
        user: data.user,
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/menu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`${styles.wrap} ${variant === 'page' ? styles.page : ''} ${isLeaf ? styles.leaf : ''}`}
    >
      <div className={styles.brandMark}>
        <Leaf size={isLeaf ? 28 : variant === 'page' ? 36 : 32} />
      </div>

      <h1 className={styles.title}>
        {mode === 'login' ? 'Welcome back' : 'Join ProjectFit'}
      </h1>
      <p className={styles.subtitle}>
        {mode === 'login'
          ? 'Sign in to track meals & plans'
          : 'Start your nutrition journey'}
      </p>

      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'login' ? styles.tabActive : styles.tab}
          onClick={() => setMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === 'signup' ? styles.tabActive : styles.tab}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <label className={styles.field}>
            <User size={16} />
            <input type="text" name="name" placeholder="Full name" autoComplete="name" required />
          </label>
        )}
        <label className={styles.field}>
          <Mail size={16} />
          <input type="email" name="email" placeholder="Email address" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          <Lock size={16} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </label>

        {mode === 'login' && (
          <div className={styles.forgot}>
            <Link href="/login">Forgot password?</Link>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
          {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className={styles.footerNote}>
        {mode === 'login' ? (
          <>
            New here?{' '}
            {variant === 'page' ? (
              <Link href="/signup">Sign up</Link>
            ) : (
              <button type="button" onClick={() => setMode('signup')}>
                Sign up
              </button>
            )}
          </>
        ) : (
          <>
            Already have an account?{' '}
            {variant === 'page' ? (
              <Link href="/login">Log in</Link>
            ) : (
              <button type="button" onClick={() => setMode('login')}>
                Log in
              </button>
            )}
          </>
        )}
      </p>
    </div>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.ok
        ? 'The server returned an invalid auth response.'
        : 'The server returned an error instead of JSON.',
    };
  }
}
