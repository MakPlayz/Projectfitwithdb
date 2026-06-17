create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null,
  whatsapp_opt_in boolean not null default false,
  whatsapp_opt_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  age integer not null check (age between 13 and 100),
  gender text not null default 'prefer-not-to-say',
  height_cm integer not null check (height_cm between 100 and 250),
  weight_kg numeric(5, 2) not null check (weight_kg between 25 and 300),
  activity_level text not null,
  primary_goal text not null,
  health_focus text not null default 'general',
  diet_preference text not null default 'balanced',
  allergies text[] not null default '{}',
  health_notes text,
  recommended_path text not null,
  recommendation_summary text not null,
  coach_notes text[] not null default '{}',
  is_profile_complete boolean not null default false,
  medical_report_file_name text,
  medical_report_file_type text,
  medical_report_file_data text,
  medical_report_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key default ('PF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  items jsonb not null,
  subtotal integer not null,
  tax integer not null,
  total integer not null,
  payment_option text not null default 'full' check (payment_option in ('full', 'half')),
  payment_stage text not null default 'pending_initial'
    check (payment_stage in ('pending_initial', 'half_paid', 'paid_full', 'stopped_midway', 'completed')),
  initial_payment_amount integer not null default 0,
  remaining_payment_amount integer not null default 0,
  remaining_payment_due_at timestamptz,
  remaining_payment_paid_at timestamptz,
  plan_completed_at timestamptz,
  completion_reason text,
  order_type text not null default 'paid_plan' check (order_type in ('paid_plan', 'free_sample')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_transaction_id text,
  delivery_address jsonb not null default '{}'::jsonb,
  requested_start_date date,
  plan_activated_at timestamptz,
  plan_expires_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0),
  category text not null,
  program_slug text not null default 'main',
  photo_url text,
  servings integer not null default 1 check (servings > 0),
  protein_grams numeric(6, 2),
  ingredients text[] not null default '{}',
  is_free_sample boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0),
  duration text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  phone text not null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  message_type text not null,
  template_name text,
  message_body text,
  status text not null check (status in ('received', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message text not null check (char_length(trim(message)) between 5 and 1200),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.free_sample_device_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  order_id text references public.orders(id) on delete set null,
  active boolean not null default true,
  reset_by uuid,
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  customer_name text,
  items jsonb not null,
  subtotal integer not null,
  tax integer not null,
  total integer not null,
  payment_option text not null default 'full' check (payment_option in ('full', 'half')),
  payable_now integer not null default 0,
  remaining_amount integer not null default 0,
  order_type text not null check (order_type in ('paid_plan', 'free_sample')),
  delivery_address jsonb not null default '{}'::jsonb,
  requested_start_date date,
  free_sample_device_id text,
  status text not null default 'pending' check (status in ('pending', 'converted', 'expired', 'cancelled')),
  order_id text references public.orders(id) on delete set null,
  whatsapp_from text,
  whatsapp_message_id text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_plan_overrides (
  plan_id text primary key,
  name text,
  duration text,
  price integer check (price is null or price >= 0),
  highlight text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_type text not null default 'paid_plan',
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_transaction_id text,
  add column if not exists delivery_address jsonb not null default '{}'::jsonb,
  add column if not exists requested_start_date date,
  add column if not exists plan_activated_at timestamptz,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists whatsapp_checkout_intent_id uuid references public.checkout_intents(id) on delete set null,
  add column if not exists customer_delivery_status text not null default 'pending',
  add column if not exists customer_delivery_confirmed_at timestamptz,
  add column if not exists customer_delivery_response_payload jsonb not null default '{}'::jsonb;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'));

alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders
  add constraint orders_order_type_check
  check (order_type in ('paid_plan', 'free_sample'));

alter table public.orders drop constraint if exists orders_customer_delivery_status_check;
alter table public.orders
  add constraint orders_customer_delivery_status_check
  check (customer_delivery_status in ('pending', 'received', 'not_received'));

alter table public.menu_items
  add column if not exists program_slug text not null default 'main',
  add column if not exists photo_url text,
  add column if not exists servings integer not null default 1,
  add column if not exists protein_grams numeric(6, 2),
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists is_free_sample boolean not null default false;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_plan_expires_at_idx on public.orders (plan_expires_at);
create index if not exists orders_requested_start_date_idx on public.orders (requested_start_date);
create index if not exists orders_payment_transaction_id_idx on public.orders (payment_transaction_id);
create index if not exists orders_order_type_idx on public.orders (order_type);
create index if not exists users_whatsapp_opt_in_idx on public.users (whatsapp_opt_in);
create index if not exists customer_profiles_goal_idx on public.customer_profiles (primary_goal);
create index if not exists customer_profiles_focus_idx on public.customer_profiles (health_focus);
create index if not exists menu_items_active_idx on public.menu_items (active);
create index if not exists menu_items_program_slug_idx on public.menu_items (program_slug);
create index if not exists menu_items_free_sample_idx on public.menu_items (is_free_sample);
create index if not exists meal_plans_active_idx on public.meal_plans (active);
create index if not exists whatsapp_message_logs_created_at_idx on public.whatsapp_message_logs (created_at desc);
create index if not exists whatsapp_message_logs_status_idx on public.whatsapp_message_logs (status);
create index if not exists whatsapp_message_logs_phone_idx on public.whatsapp_message_logs (phone);
create index if not exists customer_feedback_user_id_idx on public.customer_feedback (user_id);
create index if not exists customer_feedback_created_at_idx on public.customer_feedback (created_at desc);
create index if not exists customer_feedback_status_idx on public.customer_feedback (status);
create index if not exists program_plan_overrides_active_idx on public.program_plan_overrides (active);
create index if not exists free_sample_device_claims_device_active_idx on public.free_sample_device_claims (device_id, active);
create index if not exists free_sample_device_claims_user_active_idx on public.free_sample_device_claims (user_id, active);
create index if not exists free_sample_device_claims_order_idx on public.free_sample_device_claims (order_id);
create index if not exists checkout_intents_code_idx on public.checkout_intents (code);
create index if not exists checkout_intents_user_status_idx on public.checkout_intents (user_id, status);
create index if not exists checkout_intents_expires_at_idx on public.checkout_intents (expires_at);
create index if not exists checkout_intents_order_id_idx on public.checkout_intents (order_id);
create index if not exists orders_whatsapp_checkout_intent_idx on public.orders (whatsapp_checkout_intent_id);
create index if not exists orders_customer_delivery_status_idx on public.orders (customer_delivery_status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
drop trigger if exists menu_items_set_updated_at on public.menu_items;
drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
drop trigger if exists program_plan_overrides_set_updated_at on public.program_plan_overrides;
drop trigger if exists customer_feedback_set_updated_at on public.customer_feedback;
drop trigger if exists free_sample_device_claims_set_updated_at on public.free_sample_device_claims;
drop trigger if exists checkout_intents_set_updated_at on public.checkout_intents;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create trigger customer_profiles_set_updated_at
before update on public.customer_profiles
for each row
execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row
execute function public.set_updated_at();

create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row
execute function public.set_updated_at();

create trigger program_plan_overrides_set_updated_at
before update on public.program_plan_overrides
for each row
execute function public.set_updated_at();

create trigger customer_feedback_set_updated_at
before update on public.customer_feedback
for each row
execute function public.set_updated_at();

create trigger free_sample_device_claims_set_updated_at
before update on public.free_sample_device_claims
for each row
execute function public.set_updated_at();

create trigger checkout_intents_set_updated_at
before update on public.checkout_intents
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.whatsapp_message_logs enable row level security;
alter table public.program_plan_overrides enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.free_sample_device_claims enable row level security;
alter table public.checkout_intents enable row level security;

drop policy if exists "Users can read their own app user row" on public.users;
create policy "Users can read their own app user row"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own profile" on public.customer_profiles;
create policy "Users can read their own profile"
on public.customer_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.customer_profiles;
create policy "Users can insert their own profile"
on public.customer_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.customer_profiles;
create policy "Users can update their own profile"
on public.customer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
