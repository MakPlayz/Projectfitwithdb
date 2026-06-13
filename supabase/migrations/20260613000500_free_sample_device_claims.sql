alter table public.orders
  add column if not exists cancellation_reason text;

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

create index if not exists free_sample_device_claims_device_active_idx
  on public.free_sample_device_claims (device_id, active);
create index if not exists free_sample_device_claims_user_active_idx
  on public.free_sample_device_claims (user_id, active);
create index if not exists free_sample_device_claims_order_idx
  on public.free_sample_device_claims (order_id);

drop trigger if exists free_sample_device_claims_set_updated_at on public.free_sample_device_claims;
create trigger free_sample_device_claims_set_updated_at
before update on public.free_sample_device_claims
for each row execute function public.set_updated_at();

alter table public.free_sample_device_claims enable row level security;
