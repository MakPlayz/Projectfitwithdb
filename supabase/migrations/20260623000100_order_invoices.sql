create table if not exists public.order_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  invoice_number text not null unique,
  customer_email text not null,
  customer_name text,
  subtotal integer not null default 0,
  tax integer not null default 0,
  total integer not null default 0,
  amount_paid integer not null default 0,
  balance_due integer not null default 0,
  payment_option text not null default 'full' check (payment_option in ('full', 'half')),
  payment_stage text not null,
  status text not null default 'issued' check (status in ('issued', 'void')),
  issued_at timestamptz not null default now(),
  email_sent_at timestamptz,
  provider_message_id text,
  pdf_filename text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists order_invoices_order_id_uidx on public.order_invoices (order_id);
create index if not exists order_invoices_user_id_idx on public.order_invoices (user_id);
create index if not exists order_invoices_issued_at_idx on public.order_invoices (issued_at desc);

drop trigger if exists order_invoices_set_updated_at on public.order_invoices;
create trigger order_invoices_set_updated_at
before update on public.order_invoices
for each row execute function public.set_updated_at();

alter table public.order_invoices enable row level security;

drop policy if exists "Users can read their own invoices" on public.order_invoices;
create policy "Users can read their own invoices"
on public.order_invoices
for select
to authenticated
using (auth.uid() = user_id);
