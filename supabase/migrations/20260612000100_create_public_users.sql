create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null,
  whatsapp_opt_in boolean not null default false,
  whatsapp_opt_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists users_whatsapp_opt_in_idx on public.users (whatsapp_opt_in);

alter table public.users enable row level security;

drop policy if exists "Users can read their own app user row" on public.users;
create policy "Users can read their own app user row"
on public.users
for select
to authenticated
using (auth.uid() = id);
