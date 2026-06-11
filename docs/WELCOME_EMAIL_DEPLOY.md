# Welcome Email Deploy

This deploys a separate Project Fit Vizag welcome email after a user confirms their Supabase Auth email.

Do not commit or paste secret values. Read secrets from local `env.download`.

## Current ProjectFitDB status

- Edge Function `send-welcome-email` is deployed on project `ikxpaosrzkctqvhxihpe`.
- Edge Function secrets `RESEND_API_KEY` and `PROJECTFIT_SERVICE_ROLE_KEY` are set.
- `pg_net` is enabled in the remote database.
- Trigger function `public.send_welcome_email_on_confirm()` exists.
- Trigger `send_welcome_email_after_confirm` exists on `auth.users`.
- No-send endpoint smoke test passed: authenticated `POST {}` returns `400 {"error":"email is required"}`.

## Files

- Edge Function: `supabase/functions/send-welcome-email/index.ts`
- Migration: `supabase/migrations/20260611000100_welcome_email_trigger.sql`
- Supabase config: `supabase/config.toml`

## Required Supabase Edge Function secrets

Set these in Supabase Edge Function secrets:

```text
RESEND_API_KEY
PROJECTFIT_SERVICE_ROLE_KEY
```

`PROJECTFIT_SERVICE_ROLE_KEY` should contain the same value as `SUPABASE_SERVICE_ROLE_KEY` from `env.download`. It is used by the function to verify the database trigger call. `RESEND_API_KEY` is used to call Resend.

## CLI deploy path

From the repo root:

```bash
supabase link --project-ref ikxpaosrzkctqvhxihpe
supabase secrets set RESEND_API_KEY="<from env.download>"
supabase secrets set PROJECTFIT_SERVICE_ROLE_KEY="<SUPABASE_SERVICE_ROLE_KEY from env.download>"
supabase functions deploy send-welcome-email --no-verify-jwt
```

If the CLI asks you to log in:

```bash
supabase login
```

## SQL trigger setup

The migration file intentionally contains placeholders:

```text
__SUPABASE_URL__
__SERVICE_ROLE_KEY__
```

Before running it in Supabase SQL Editor, replace them locally with:

```text
__SUPABASE_URL__       -> SUPABASE_URL from env.download
__SERVICE_ROLE_KEY__   -> SUPABASE_SERVICE_ROLE_KEY from env.download
```

Then run the SQL in:

```text
Supabase Dashboard -> SQL Editor
```

The SQL enables `pg_net`, creates `public.send_welcome_email_on_confirm()`, and adds an `AFTER UPDATE` trigger on `auth.users.email_confirmed_at`.

If `pg_net` fails, enable it manually:

```text
Supabase Dashboard -> Database -> Extensions -> pg_net
```

## Function smoke test

After deploying the function and secrets, test with a real email address:

```bash
curl -X POST "https://ikxpaosrzkctqvhxihpe.supabase.co/functions/v1/send-welcome-email" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"your-test-email@example.com\",\"name\":\"Test User\"}"
```

Expected:

```json
{"ok":true,"id":"..."}
```

Check:

- Supabase Edge Function logs
- Resend Emails logs
- Inbox and spam folder

## Live test

1. Sign up with a new email.
2. Open the confirmation email.
3. Click the confirmation link.
4. Confirm the welcome email arrives after confirmation.
5. Confirm clicking the confirmation link again does not send another welcome email.

## Notes

- This does not change Supabase Auth confirmation/reset templates.
- This does not use the Supabase Send Email Hook.
- The sender is `Project Fit Vizag <noreply@projectfitvizag.com>`.
- The Resend domain `projectfitvizag.com` must stay verified.
