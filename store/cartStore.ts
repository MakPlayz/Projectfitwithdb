import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  basePrice: number;
  quantity: number;
  image: string;
  itemType?: 'plan' | 'free_sample';
  programSlug?: string;
  removedIngredients: string[];
  addOns: { name: string; price: number }[];
  totalPrice: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return { items: state.items };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) =>
              i.id === id
                ? { ...i, quantity, totalPrice: (i.totalPrice / i.quantity) * quantity }
                : i
            ),
    })),

  clearCart: () => set({ items: [] }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.totalPrice, 0),

  getCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
