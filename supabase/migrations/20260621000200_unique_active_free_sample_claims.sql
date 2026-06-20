create unique index if not exists free_sample_device_claims_active_device_uidx
  on public.free_sample_device_claims (device_id)
  where active = true;

create unique index if not exists free_sample_device_claims_active_user_uidx
  on public.free_sample_device_claims (user_id)
  where active = true;
