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

alter table public.orders
  add column if not exists whatsapp_checkout_intent_id uuid references public.checkout_intents(id) on delete set null,
  add column if not exists customer_delivery_status text not null default 'pending'
    check (customer_delivery_status in ('pending', 'received', 'not_received')),
  add column if not exists customer_delivery_confirmed_at timestamptz,
  add column if not exists customer_delivery_response_payload jsonb not null default '{}'::jsonb;

create index if not exists checkout_intents_code_idx on public.checkout_intents (code);
create index if not exists checkout_intents_user_status_idx on public.checkout_intents (user_id, status);
create index if not exists checkout_intents_expires_at_idx on public.checkout_intents (expires_at);
create index if not exists checkout_intents_order_id_idx on public.checkout_intents (order_id);
create index if not exists orders_whatsapp_checkout_intent_idx on public.orders (whatsapp_checkout_intent_id);
create index if not exists orders_customer_delivery_status_idx on public.orders (customer_delivery_status);

alter table public.checkout_intents enable row level security;

drop trigger if exists checkout_intents_set_updated_at on public.checkout_intents;
create trigger checkout_intents_set_updated_at
before update on public.checkout_intents
for each row
execute function public.set_updated_at();
