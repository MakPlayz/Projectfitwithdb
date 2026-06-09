'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth-client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const authorizedRef = useRef(authorized);
  authorizedRef.current = authorized;

  useEffect(() => {
    const checkAuth = () => {
      const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/chef';
      const session = getSession();

      console.log('[AuthGuard] checkAuth:', {
        pathname,
        isAuthPage,
        hasSession: !!session,
        wasAuthorized: authorizedRef.current
      });

      if (isAuthPage) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (!session) {
        // If we were authorized, don't set authorized to false immediately.
        // This keeps the current page component mounted while Next.js transitions to /login,
        // preventing the router from getting stuck due to premature unmounting.
        if (!authorizedRef.current) {
          setAuthorized(false);
        }
        setLoading(false);
        
        const target = pathname?.startsWith('/chef') ? '/chef' : '/login';
        console.log('[AuthGuard] Redirecting to:', target);
        router.replace(target);
      } else {
        setAuthorized(true);
        setLoading(false);
      }
    };

    checkAuth();
    
    // Listen for custom auth change events
    window.addEventListener('projectfit-auth-changed', checkAuth);
    return () => {
      window.removeEventListener('projectfit-auth-changed', checkAuth);
    };
  }, [pathname, router]);

  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/chef';

  console.log('[AuthGuard] Render:', {
    loading,
    authorized,
    isAuthPage,
    shouldShowRedirecting: loading || (!authorized && !isAuthPage)
  });

  if (loading || (!authorized && !isAuthPage)) {
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

  return <>{children}</>;
}
