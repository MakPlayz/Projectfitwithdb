import type { CartItem } from '@/store/cartStore';

export type ApiOrderStatus = 'new' | 'preparing' | 'ready';
export type CustomerGoal =
  | 'weight-loss'
  | 'maintenance'
  | 'muscle-gain'
  | 'better-fitness';
export type HealthFocus = 'general' | 'pregnancy' | 'pcos-pcod' | 'diabetes';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly-active'
  | 'moderately-active'
  | 'very-active';
export type DietPreference =
  | 'balanced'
  | 'vegetarian'
  | 'eggetarian'
  | 'non-vegetarian'
  | 'vegan';
export type GenderIdentity =
  | 'female'
  | 'male'
  | 'non-binary'
  | 'prefer-not-to-say';

export interface CustomerProfile {
  user_id: string;
  full_name: string;
  age: number;
  gender: GenderIdentity;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  primary_goal: CustomerGoal;
  health_focus: HealthFocus;
  diet_preference: DietPreference;
  allergies: string[];
  health_notes: string | null;
  recommended_path: string;
  recommendation_summary: string;
  coach_notes: string[];
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfilePayload {
  full_name: string;
  age: number;
  gender: GenderIdentity;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  primary_goal: CustomerGoal;
  health_focus: HealthFocus;
  diet_preference: DietPreference;
  allergies: string[];
  health_notes: string;
}

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
  customer_profile?: CustomerProfile | null;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
}
