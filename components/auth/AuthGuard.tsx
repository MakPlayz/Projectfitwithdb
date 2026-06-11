'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const checkAuth = () => {
      const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/chef';
      const isProtectedPage = pathname === '/menu' || pathname === '/chef/dashboard';
      const session = getSession();

      if (isAuthPage || !isProtectedPage) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        
        const target = pathname?.startsWith('/chef') ? '/chef' : '/login';
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

  const isProtectedPage = pathname === '/menu' || pathname === '/chef/dashboard';

  if (isProtectedPage && (loading || !authorized)) {
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
