import { create } from 'zustand';

export interface AuthOrigin {
  x: number;
  y: number;
}

interface AuthModalStore {
  isOpen: boolean;
  origin: AuthOrigin | null;
  open: (origin: AuthOrigin) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  origin: null,
  open: (origin) => set({ isOpen: true, origin }),
  close: () => set({ isOpen: false, origin: null }),
}));
