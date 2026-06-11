'use client';

import { useEffect } from 'react';
import { clearSession } from '@/lib/auth-client';

const sensitiveHashKeys = new Set([
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
]);

function hashContainsAuthTokens(hash: string) {
  if (!hash || hash === '#') {
    return false;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Array.from(sensitiveHashKeys).some((key) => params.has(key));
}

export default function AuthUrlScrubber() {
  useEffect(() => {
    if (!hashContainsAuthTokens(window.location.hash)) {
      return;
    }

    clearSession();

    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, document.title, cleanUrl);

    if (window.location.pathname === '/') {
      window.location.replace('/login?confirmed=1');
    }
  }, []);

  return null;
}
