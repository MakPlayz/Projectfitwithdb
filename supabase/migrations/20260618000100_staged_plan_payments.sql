alter table public.checkout_intents
  add column if not exists payment_option text not null default 'full' check (payment_option in ('full', 'half')),
  add column if not exists payable_now integer not null default 0,
  add column if not exists remaining_amount integer not null default 0;

alter table public.orders
  add column if not exists payment_option text not null default 'full' check (payment_option in ('full', 'half')),
  add column if not exists payment_stage text not null default 'pending_initial'
    check (payment_stage in ('pending_initial', 'half_paid', 'paid_full', 'stopped_midway', 'completed')),
  add column if not exists initial_payment_amount integer not null default 0,
  add column if not exists remaining_payment_amount integer not null default 0,
  add column if not exists remaining_payment_due_at timestamptz,
  add column if not exists remaining_payment_paid_at timestamptz,
  add column if not exists plan_completed_at timestamptz,
  add column if not exists completion_reason text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'));

create index if not exists orders_payment_option_idx on public.orders (payment_option);
create index if not exists orders_payment_stage_idx on public.orders (payment_stage);
create index if not exists orders_remaining_payment_due_at_idx on public.orders (remaining_payment_due_at);
