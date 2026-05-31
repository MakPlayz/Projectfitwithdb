import { create } from 'zustand';
import { CartItem } from './cartStore';

export type OrderStatus = 'new' | 'preparing' | 'ready';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  placedAt: string;
  status: OrderStatus;
  customerName?: string;
}

interface OrderState {
  orders: Order[];
  placeOrder: (items: CartItem[], total: number) => string;
  updateStatus: (orderId: string, status: OrderStatus) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],

  placeOrder: (items, total) => {
    const id = `PF-${Date.now().toString().slice(-6)}`;
    const order: Order = {
      id,
      items,
      total,
      placedAt: new Date().toISOString(),
      status: 'new',
    };
    set((state) => ({ orders: [...state.orders, order] }));
    return id;
  },

  updateStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      ),
    })),
}));
