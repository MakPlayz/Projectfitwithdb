'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Phone, Calendar, Scale, Heart, Ruler } from 'lucide-react';
import Broccoli from '@/components/ui/Broccoli';
import { getAccessTokenExpiry, saveSession } from '@/lib/auth-client';
import { isValidHeightCm, parseHeightToCm, type HeightUnit } from '@/lib/height';
import { mergeStoredProfile } from '@/lib/profile-storage';
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
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const isLeaf = variant === 'leaf' || variant === 'modal';
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));

  const handleGoogleSignIn = () => {
    const googleUrl = new URL('/api/auth/google', window.location.origin);
    googleUrl.searchParams.set('next', nextPath);
    window.location.href = googleUrl.toString();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const height = parseHeightToCm(formData.get('height'), heightUnit);
    if (mode === 'signup' && !isValidHeightCm(height)) {
      setError('Enter a valid height in centimeters or feet/inches.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      whatsappOptIn: formData.get('whatsappOptIn') === 'on',
      gender: String(formData.get('gender') ?? ''),
      age: formData.get('age') ? Number(formData.get('age')) : undefined,
      height: height ?? undefined,
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

      if (mode === 'signup' && !data.access_token) {
        mergeStoredProfile({
          fullName: payload.name,
          phone: payload.phone,
          gender: payload.gender,
          age: payload.age ?? '',
          height: payload.height ?? '',
          weight: payload.weight ?? '',
          healthNotes: payload.healthNotes,
          image: '',
        });
        setStatus('Account created. Please check your email to confirm your account, then sign in.');
        setMode('login');
        return;
      }

      if (!data.access_token || !data.user) {
        throw new Error('Signup completed, but no login session was returned.');
      }

      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: getAccessTokenExpiry(data.access_token),
        user: data.user,
      });
      if (mode === 'signup') {
        mergeStoredProfile({
          fullName: payload.name,
          phone: payload.phone,
          gender: payload.gender,
          age: payload.age ?? '',
          height: payload.height ?? '',
          weight: payload.weight ?? '',
          healthNotes: payload.healthNotes,
          image: '',
        });
      }
      onSuccess?.();
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <>
      <div className={styles.brandMark}>
        {variant === 'page' ? (
          <div className={styles.brandImage} />
        ) : (
          <Broccoli size={isLeaf ? 28 : 36} />
        )}
      </div>

      <h1 className={styles.title}>
        {mode === 'login' ? 'Welcome back' : 'Create account'}
      </h1>
      <p className={styles.subtitle}>
        {mode === 'login'
          ? 'Sign in to track meals & plans'
          : 'Start tracking meals & plans'}
      </p>

      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'login' ? styles.tabActive : styles.tab}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'signup' ? styles.tabActive : styles.tab}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      <button type="button" className={styles.googleBtn} onClick={handleGoogleSignIn}>
        <svg className={styles.googleMark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
          />
        </svg>
        Continue with Google
      </button>

      <div className={styles.divider}>
        <span>or</span>
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
              <label className={`${styles.field} ${styles.heightField}`}>
                <Ruler size={16} />
                <input
                  type="text"
                  name="height"
                  placeholder={heightUnit === 'cm' ? '170 cm' : '5 ft 7 in'}
                  inputMode={heightUnit === 'cm' ? 'numeric' : 'text'}
                  required
                />
                <span className={styles.unitToggle} aria-label="Height unit">
                  <button
                    type="button"
                    className={heightUnit === 'cm' ? styles.unitActive : styles.unit}
                    onClick={() => setHeightUnit('cm')}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    className={heightUnit === 'ft-in' ? styles.unitActive : styles.unit}
                    onClick={() => setHeightUnit('ft-in')}
                  >
                    ft/in
                  </button>
                </span>
              </label>
            </div>

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
            <span>Forgot password? Contact Project Fit support to reset it.</span>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {status && <p className={styles.success}>{status}</p>}

        <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
          {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
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
              Sign in
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
          <Image
            src="/images/projectfit-auth/projectfit-promo-panel.png"
            alt="ProjectFit nutrition and fitness collage"
            fill
            sizes="(min-width: 980px) 624px, 100vw"
            className={styles.promoImage}
            priority
          />
        </div>
        <div className={styles.formSide}>
          <div className={styles.broccoliFrame} aria-hidden>
            <Image
              src="/images/projectfit-auth/broccoli-frame.png"
              alt=""
              fill
              sizes="739px"
              className={styles.frameImage}
              priority
            />
          </div>
          <div className={styles.authSurface} />
          <div className={`${styles.formSideInner} ${styles.page}`}>
            <div className={styles.formScroll}>{formContent}</div>
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

function getSafeNextPath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
