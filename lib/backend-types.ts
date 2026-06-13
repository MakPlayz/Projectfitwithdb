import type { CartItem } from '@/store/cartStore';

export type ApiOrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type CustomerGoal =
  | 'weight-loss'
  | 'maintenance'
  | 'muscle-gain'
  | 'better-fitness';
export type HealthFocus = 'general' | 'pregnancy' | 'pcos-pcod' | 'diabetes' | 'kids';
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

export interface ProjectFitUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  created_at: string;
}

export interface CustomerFeedback {
  id: string;
  user_id: string;
  message: string;
  status: 'new' | 'reviewed' | 'archived';
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  customer_email?: string | null;
}

export interface FreeSampleDeviceClaim {
  id: string;
  user_id: string;
  device_id: string;
  order_id: string | null;
  active: boolean;
  reset_by: string | null;
  reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  program_slug: string;
  photo_url: string | null;
  servings: number;
  protein_grams: number | null;
  ingredients: string[];
  is_free_sample: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type WhatsAppMessageDirection = 'incoming' | 'outgoing';
export type WhatsAppMessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppMessageLog {
  id: string;
  user_id: string | null;
  phone: string;
  direction: WhatsAppMessageDirection;
  message_type: string;
  template_name: string | null;
  message_body: string | null;
  status: WhatsAppMessageStatus;
  provider_message_id: string | null;
  error_message: string | null;
  payload: unknown;
  created_at: string;
}

export interface DeliveryAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  pincode: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiOrder {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  order_type: 'paid_plan' | 'free_sample';
  status: ApiOrderStatus;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_transaction_id: string | null;
  delivery_address: DeliveryAddress;
  requested_start_date: string | null;
  plan_activated_at: string | null;
  plan_expires_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at?: string;
  customer_profile?: CustomerProfile | null;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    phone?: string;
  };
}
