create extension if not exists pgcrypto;

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
  status text not null default 'new' check (status in ('new', 'preparing', 'ready')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  delivery_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists delivery_address jsonb not null default '{}'::jsonb;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists customer_profiles_goal_idx on public.customer_profiles (primary_goal);
create index if not exists customer_profiles_focus_idx on public.customer_profiles (health_focus);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create trigger customer_profiles_set_updated_at
before update on public.customer_profiles
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.customer_profiles enable row level security;

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
