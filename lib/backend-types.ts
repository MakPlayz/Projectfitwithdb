import type { CartItem } from '@/store/cartStore';

export type ApiOrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentOption = 'full' | 'half';
export type PaymentStage = 'pending_initial' | 'half_paid' | 'paid_full' | 'stopped_midway' | 'completed';
export type CheckoutIntentStatus = 'pending' | 'converted' | 'expired' | 'cancelled';
export type CustomerDeliveryStatus = 'pending' | 'received' | 'not_received';
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
  medical_report_file_name: string | null;
  medical_report_file_type: string | null;
  medical_report_file_data: string | null;
  medical_report_uploaded_at: string | null;
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
  medical_report_file_name?: string | null;
  medical_report_file_type?: string | null;
  medical_report_file_data?: string | null;
  medical_report_uploaded_at?: string | null;
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

export interface CheckoutIntent {
  id: string;
  code: string;
  user_id: string;
  phone: string;
  customer_name: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_option: PaymentOption;
  payable_now: number;
  remaining_amount: number;
  order_type: 'paid_plan' | 'free_sample';
  delivery_address: DeliveryAddress;
  requested_start_date: string | null;
  free_sample_device_id: string | null;
  status: CheckoutIntentStatus;
  order_id: string | null;
  whatsapp_from: string | null;
  whatsapp_message_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at?: string;
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

export type PlanPauseStatus = 'approved' | 'cancelled';

export interface PlanPauseRequest {
  id: string;
  order_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  skipped_dates: string[];
  extension_days: number;
  previous_plan_expires_at: string;
  new_plan_expires_at: string;
  previous_remaining_payment_due_at: string | null;
  new_remaining_payment_due_at: string | null;
  status: PlanPauseStatus;
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
  payment_option: PaymentOption;
  payment_stage: PaymentStage;
  initial_payment_amount: number;
  remaining_payment_amount: number;
  remaining_payment_due_at: string | null;
  remaining_payment_paid_at: string | null;
  plan_completed_at: string | null;
  completion_reason: string | null;
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
  whatsapp_checkout_intent_id: string | null;
  customer_delivery_status: CustomerDeliveryStatus;
  customer_delivery_confirmed_at: string | null;
  customer_delivery_response_payload: unknown;
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
