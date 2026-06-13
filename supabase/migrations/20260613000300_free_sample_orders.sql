alter table public.menu_items
  add column if not exists is_free_sample boolean not null default false;

alter table public.orders
  add column if not exists order_type text not null default 'paid_plan';

alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders
  add constraint orders_order_type_check
  check (order_type in ('paid_plan', 'free_sample'));

create index if not exists menu_items_free_sample_idx on public.menu_items (is_free_sample);
create index if not exists orders_order_type_idx on public.orders (order_type);
