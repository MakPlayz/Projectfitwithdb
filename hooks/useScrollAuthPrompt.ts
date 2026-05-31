'use client';

import { useEffect, useRef } from 'react';
import { useAuthModalStore } from '@/store/authModalStore';

const STORAGE_KEY = 'projectfit-auth-prompt-shown';
const SCROLL_THRESHOLD = 420;

/**
 * Opens leaf auth modal once per session after user scrolls past threshold.
 */
export function useScrollAuthPrompt(getOrigin: () => { x: number; y: number } | null) {
  const open = useAuthModalStore((s) => s.open);
  const isOpen = useAuthModalStore((s) => s.isOpen);
  const triggered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const onScroll = () => {
      if (triggered.current || isOpen) return;
      if (window.scrollY < SCROLL_THRESHOLD) return;

      const origin = getOrigin();
      if (!origin) return;

      triggered.current = true;
      sessionStorage.setItem(STORAGE_KEY, '1');
      open(origin);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, isOpen, getOrigin]);
}
