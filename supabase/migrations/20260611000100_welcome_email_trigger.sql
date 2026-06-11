create extension if not exists pg_net with schema extensions;

create or replace function public.send_welcome_email_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_id bigint;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    select net.http_post(
      url := '__SUPABASE_URL__/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer __SERVICE_ROLE_KEY__'
      ),
      body := jsonb_build_object(
        'email', new.email,
        'name', coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
      )
    )
    into request_id;
  end if;

  return new;
end;
$$;

drop trigger if exists send_welcome_email_after_confirm on auth.users;

create trigger send_welcome_email_after_confirm
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.send_welcome_email_on_confirm();
