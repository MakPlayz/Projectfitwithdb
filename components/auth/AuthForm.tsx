'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Calendar, Scale, Heart } from 'lucide-react';
import Broccoli from '@/components/ui/Broccoli';
import { getAccessTokenExpiry, saveSession } from '@/lib/auth-client';
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
      phone: String(formData.get('phone') ?? ''),
      whatsappOptIn: formData.get('whatsappOptIn') === 'on',
      gender: String(formData.get('gender') ?? ''),
      age: formData.get('age') ? Number(formData.get('age')) : undefined,
      weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
      healthNotes: String(formData.get('healthNotes') ?? ''),
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
        refreshToken: data.refresh_token ?? null,
        expiresAt: getAccessTokenExpiry(data.access_token),
        user: data.user,
      });
      onSuccess?.();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <>
      <div className={styles.brandMark}>
        <Broccoli size={isLeaf ? 28 : 36} />
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
          <>
            <label className={styles.field}>
              <User size={16} />
              <input type="text" name="name" placeholder="Full name" autoComplete="name" required />
            </label>
            <label className={styles.field}>
              <Phone size={16} />
              <input
                type="tel"
                name="phone"
                placeholder="WhatsApp number"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </label>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <Calendar size={16} />
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  min={13}
                  max={100}
                  required
                />
              </label>
              <label className={styles.field}>
                <Scale size={16} />
                <input
                  type="number"
                  name="weight"
                  placeholder="Weight (kg)"
                  min={25}
                  max={300}
                  step="0.1"
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <User size={16} />
              <select name="gender" required className={styles.select} defaultValue="">
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </label>

            <label className={styles.field}>
              <Heart size={16} />
              <input
                type="text"
                name="healthNotes"
                placeholder="Health issues (e.g. None)"
              />
            </label>
          </>
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

        {mode === 'signup' && (
          <div className={styles.consentGroup}>
            <label className={styles.consent}>
              <input type="checkbox" name="whatsappOptIn" defaultChecked required />
              <span>I agree to receive WhatsApp promotional messages.</span>
            </label>
            <label className={styles.consent}>
              <input type="checkbox" name="termsAccept" required />
              <span>
                I accept the{' '}
                <Link href="/terms" target="_blank" className={styles.consentLink}>
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className={styles.consentLink}>
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>
        )}

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
            <button type="button" onClick={() => setMode('signup')}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => setMode('login')}>
              Log in
            </button>
          </>
        )}
      </p>
    </>
  );

  if (variant === 'page') {
    return (
      <div className={styles.splitCard}>
        <div className={styles.collageSide}>
          <div className={styles.collageGrid}>
            <div className={styles.collageColumn}>
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                alt="Healthy Fresh Salad"
                className={`${styles.collageImg} ${styles.img1}`}
              />
              <img
                src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80"
                alt="Yoga & Mindful Fitness"
                className={`${styles.collageImg} ${styles.img2}`}
              />
            </div>
            <div className={styles.collageColumn}>
              <img
                src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=80"
                alt="Healthy Meal Prep"
                className={`${styles.collageImg} ${styles.img3}`}
              />
              <img
                src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&auto=format&fit=crop&q=80"
                alt="Active Lifestyle Running"
                className={`${styles.collageImg} ${styles.img4}`}
              />
            </div>
          </div>
          <div className={styles.collageOverlay}>
            <div className={styles.overlayContent}>
              <span className={styles.overlayTag}>Premium Nutrition</span>
              <h2 className={styles.overlayTitle}>ProjectFit</h2>
              <p className={styles.overlayText}>
                Achieve your nutrition goals with custom diets, calorie tracking, and expert lifestyle coaching.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.formSide}>
          <div className={styles.formSideInner}>
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.wrap} ${isLeaf ? styles.leaf : ''}`}
    >
      {formContent}
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
