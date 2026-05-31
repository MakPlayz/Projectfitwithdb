import type { CartItem } from '@/store/cartStore';

export type ApiOrderStatus = 'new' | 'preparing' | 'ready';

export interface ApiOrder {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: ApiOrderStatus;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
}
