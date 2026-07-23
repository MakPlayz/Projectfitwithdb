-- Allow chefs to set a descriptive text price (e.g. "Price depends on Body & Weight")
-- instead of a fixed amount. When set, this label is shown to customers and the
-- kitchen quotes the final price over WhatsApp.
alter table public.program_plan_overrides
  add column if not exists price_label text;
