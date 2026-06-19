create table if not exists public.plan_pause_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  skipped_dates date[] not null default '{}',
  extension_days integer not null check (extension_days > 0),
  previous_plan_expires_at timestamptz not null,
  new_plan_expires_at timestamptz not null,
  previous_remaining_payment_due_at timestamptz,
  new_remaining_payment_due_at timestamptz,
  status text not null default 'approved' check (status in ('approved', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists plan_pause_requests_order_idx on public.plan_pause_requests (order_id);
create index if not exists plan_pause_requests_user_idx on public.plan_pause_requests (user_id);
create index if not exists plan_pause_requests_dates_idx on public.plan_pause_requests (start_date, end_date);
create index if not exists plan_pause_requests_status_idx on public.plan_pause_requests (status);

alter table public.plan_pause_requests enable row level security;

drop policy if exists "Users can read their own plan pauses" on public.plan_pause_requests;
create policy "Users can read their own plan pauses"
on public.plan_pause_requests
for select
to authenticated
using (auth.uid() = user_id);
