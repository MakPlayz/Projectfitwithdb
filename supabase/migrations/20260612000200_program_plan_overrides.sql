create table if not exists public.program_plan_overrides (
  plan_id text primary key,
  name text,
  duration text,
  price integer check (price is null or price >= 0),
  highlight text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists program_plan_overrides_active_idx
on public.program_plan_overrides (active);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists program_plan_overrides_set_updated_at on public.program_plan_overrides;

create trigger program_plan_overrides_set_updated_at
before update on public.program_plan_overrides
for each row
execute function public.set_updated_at();

alter table public.program_plan_overrides enable row level security;
