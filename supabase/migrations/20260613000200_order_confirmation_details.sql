alter table public.orders
  add column if not exists requested_start_date date,
  add column if not exists payment_transaction_id text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'confirmed', 'preparing', 'ready', 'cancelled'));

create index if not exists orders_requested_start_date_idx on public.orders (requested_start_date);
create index if not exists orders_payment_transaction_id_idx on public.orders (payment_transaction_id);
