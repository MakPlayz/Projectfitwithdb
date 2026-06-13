create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message text not null check (char_length(trim(message)) between 5 and 1200),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_feedback_user_id_idx on public.customer_feedback (user_id);
create index if not exists customer_feedback_created_at_idx on public.customer_feedback (created_at desc);
create index if not exists customer_feedback_status_idx on public.customer_feedback (status);

drop trigger if exists customer_feedback_set_updated_at on public.customer_feedback;
create trigger customer_feedback_set_updated_at
before update on public.customer_feedback
for each row execute function public.set_updated_at();

alter table public.customer_feedback enable row level security;
