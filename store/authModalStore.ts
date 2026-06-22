import { create } from 'zustand';

export type AuthModalMode = 'login' | 'signup';

export interface AuthOrigin {
  x: number;
  y: number;
}

interface OpenOptions {
  mode?: AuthModalMode;
  nextPath?: string | null;
}

interface AuthModalStore {
  isOpen: boolean;
  origin: AuthOrigin | null;
  mode: AuthModalMode;
  nextPath: string | null;
  open: (origin: AuthOrigin, options?: OpenOptions) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  origin: null,
  mode: 'signup',
  nextPath: null,
  open: (origin, options) =>
    set({
      isOpen: true,
      origin,
      mode: options?.mode ?? 'signup',
      nextPath: options?.nextPath ?? null,
    }),
  close: () => set({ isOpen: false, origin: null }),
}));
