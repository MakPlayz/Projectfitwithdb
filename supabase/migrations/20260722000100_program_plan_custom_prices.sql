alter table public.program_plan_overrides
  add column if not exists custom_prices jsonb;
