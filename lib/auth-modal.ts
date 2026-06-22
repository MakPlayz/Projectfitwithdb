import type { MouseEvent } from 'react';
import { useAuthModalStore, type AuthModalMode } from '@/store/authModalStore';

interface OpenAuthOptions {
  mode?: AuthModalMode;
  nextPath?: string | null;
}

/**
 * Returns a click handler factory that opens the broccoli auth popup, using the
 * clicked element's center as the fly-in origin for the animation.
 */
export function useOpenAuthModal() {
  const open = useAuthModalStore((s) => s.open);

  return (event: MouseEvent<HTMLElement>, options?: OpenAuthOptions) => {
    const rect = event.currentTarget.getBoundingClientRect();
    open(
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      options,
    );
  };
}
