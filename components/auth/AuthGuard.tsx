'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureSession, getAuthHeaders, type ProjectFitSession } from '@/lib/auth-client';
import { buildAuthRedirect, isProtectedPath } from '@/lib/protected-routes';
import ProfileCompletionModal from '@/components/auth/ProfileCompletionModal';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileRequired, setProfileRequired] = useState(false);
  const [session, setSession] = useState<ProjectFitSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/chef';
      const isAuthFlowPage = Boolean(pathname?.startsWith('/auth/'));
      const isProfilePage = pathname === '/profile';
      const isChefPage = Boolean(pathname?.startsWith('/chef'));
      const isProtectedPage = isProtectedPath(pathname);
      const currentSession = await ensureSession();

      if (cancelled) return;
      setSession(currentSession);

      if (!currentSession && (isAuthPage || !isProtectedPage)) {
        setProfileRequired(false);
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (!currentSession) {
        setProfileRequired(false);
        setAuthorized(false);
        setLoading(false);
        
        const target = pathname?.startsWith('/chef') ? '/chef' : buildAuthRedirect(pathname, '/signup');
        router.replace(target);
        return;
      }

      if (!isAuthFlowPage && !isProfilePage && !isChefPage) {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/profile', {
          headers,
          cache: 'no-store',
        });
        const data = response.ok ? await response.json() : null;

        if (cancelled) return;

        if (!data?.profile?.is_profile_complete) {
          setProfileRequired(true);
          setAuthorized(true);
          setLoading(false);
          return;
        }
      }

      setProfileRequired(false);
      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();
    
    // Listen for custom auth change events
    window.addEventListener('projectfit-auth-changed', checkAuth);
    return () => {
      cancelled = true;
      window.removeEventListener('projectfit-auth-changed', checkAuth);
    };
  }, [pathname, router]);

  const isProtectedPage = isProtectedPath(pathname);

  if (loading || (isProtectedPage && !authorized)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-display)',
        color: 'var(--text-secondary)',
        background: 'var(--bg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--green-glow)',
            borderTopColor: 'var(--green)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {profileRequired && session && (
        <ProfileCompletionModal
          defaultName={session.user.user_metadata?.name || session.user.user_metadata?.full_name || ''}
          defaultPhone={session.user.user_metadata?.phone || ''}
          onComplete={() => {
            setProfileRequired(false);
            setAuthorized(true);
          }}
        />
      )}
    </>
  );
}
