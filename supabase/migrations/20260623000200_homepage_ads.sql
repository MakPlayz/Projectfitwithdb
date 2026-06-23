insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-ads',
  'homepage-ads',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.homepage_ad_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.homepage_ad_settings (id, enabled)
values (true, false)
on conflict (id) do nothing;

create table if not exists public.homepage_ads (
  id uuid primary key default gen_random_uuid(),
  caption text not null,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  media_path text not null,
  mobile_media_type text check (mobile_media_type in ('image', 'video')),
  mobile_media_url text,
  mobile_media_path text,
  poster_url text,
  poster_path text,
  cta_label text,
  cta_href text,
  priority integer not null default 0,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists homepage_ads_active_idx on public.homepage_ads (active);
create index if not exists homepage_ads_priority_idx on public.homepage_ads (priority asc, created_at desc);
create index if not exists homepage_ads_dates_idx on public.homepage_ads (start_date, end_date);

drop trigger if exists homepage_ads_set_updated_at on public.homepage_ads;
create trigger homepage_ads_set_updated_at
before update on public.homepage_ads
for each row execute function public.set_updated_at();

drop trigger if exists homepage_ad_settings_set_updated_at on public.homepage_ad_settings;
create trigger homepage_ad_settings_set_updated_at
before update on public.homepage_ad_settings
for each row execute function public.set_updated_at();

alter table public.homepage_ads enable row level security;
alter table public.homepage_ad_settings enable row level security;

drop policy if exists "Anyone can read homepage ads" on public.homepage_ads;
create policy "Anyone can read homepage ads"
on public.homepage_ads
for select
to anon, authenticated
using (active = true);

drop policy if exists "Anyone can read homepage ad settings" on public.homepage_ad_settings;
create policy "Anyone can read homepage ad settings"
on public.homepage_ad_settings
for select
to anon, authenticated
using (true);
