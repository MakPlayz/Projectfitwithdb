alter table public.customer_profiles
  add column if not exists delivery_address jsonb;
