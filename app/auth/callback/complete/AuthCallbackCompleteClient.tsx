'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessTokenExpiry, saveSession } from '@/lib/auth-client';
import { mergeStoredProfile } from '@/lib/profile-storage';

export default function AuthCallbackCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const callbackError = searchParams.get('error')
    ? 'Google sign-in failed. Please try again.'
    : '';
  const displayError = callbackError || error;

  useEffect(() => {
    const next = searchParams.get('next') || '/';

    if (callbackError) {
      return;
    }

    let cancelled = false;

    async function completeSignIn() {
      const response = await fetch('/api/auth/oauth-session', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.access_token || !data.user) {
        throw new Error(data.error ?? 'Google sign-in failed. Please try again.');
      }

      if (cancelled) return;

      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: getAccessTokenExpiry(data.access_token),
        user: data.user,
      });

      mergeStoredProfile({
        fullName: data.user.user_metadata?.name || data.user.user_metadata?.full_name || '',
      });

      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      const profileResponse = await fetch('/api/profile', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
        cache: 'no-store',
      });
      const profileData = profileResponse.ok ? await profileResponse.json() : null;

      if (!profileData?.profile?.is_profile_complete) {
        router.replace(`/profile?completeProfile=1&next=${encodeURIComponent(safeNext)}`);
        return;
      }

      router.replace(safeNext);
    }

    completeSignIn().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [callbackError, router, searchParams]);

  return (
    <main style={{
      minHeight: '70vh',
      display: 'grid',
      placeItems: 'center',
      padding: '120px 24px',
      textAlign: 'center',
    }}>
      <div>
        <h1 style={{ marginBottom: 12 }}>{displayError ? 'Sign-in failed' : 'Signing you in...'}</h1>
        {displayError ? (
          <>
            <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{displayError}</p>
            <Link href="/login" className="btn-primary">Back to sign in</Link>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Please wait while we finish Google sign-in.</p>
        )}
      </div>
    </main>
  );
}
