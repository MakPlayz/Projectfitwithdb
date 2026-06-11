# Agent task: Post-confirmation welcome email (Supabase + Resend)

> **For the implementing agent:** Read this file end-to-end, then load credentials from  
> `C:\projectfitvizag\Projectfitwithdb\env.download`  
> **Never commit, log, or paste secret values into chat, PRs, or markdown.**

---

## Goal

Send a **separate welcome email** after a user **confirms their email** (not at signup).

| Email | When | Where configured |
|-------|------|------------------|
| Confirm signup | User signs up | Supabase Dashboard → Authentication → Email Templates (already done; **do not change** unless broken) |
| **Welcome email** | User clicks confirm link → `email_confirmed_at` is set | **New:** Edge Function + Postgres trigger + Resend API |

This mirrors the existing WhatsApp welcome pattern (`app/api/whatsapp/welcome/route.ts`) but for email.

---

## Project context

| Item | Value |
|------|--------|
| Repo path | `C:\projectfitvizag\Projectfitwithdb` |
| Stack | Next.js 16, Supabase Auth (REST), Resend (SMTP for auth emails) |
| Supabase project | **ProjectFitDB** |
| Project ref | `ikxpaosrzkctqvhxihpe` |
| Region | `ap-southeast-2` |
| Existing schema | `supabase/schema.sql` — `public.users`, `public.customer_profiles`, etc. |
| Supabase CLI folder | Only `supabase/schema.sql` exists today — **no Edge Functions yet** |

**Important:** Resend is connected via **SMTP integration** for auth emails. Do **not** enable the Supabase **Send Email Hook** unless you also handle signup, recovery, magic link, etc. This task uses a **standalone Edge Function** for the welcome email only.

---

## Credentials — read from `env.download`

Load secrets from:

```
C:\projectfitvizag\Projectfitwithdb\env.download
```

Use these keys (names only):

| Key in `env.download` | Use for |
|------------------------|---------|
| `SUPABASE_URL` | Project URL (`https://ikxpaosrzkctqvhxihpe.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Authorize trigger → Edge Function call |
| `RESEND_API_KEY` | Send email via Resend API |
| `SUPABASE_ANON_KEY` | Optional; not required for this task |

**Security rules for the agent:**

1. Do not copy secret values into source code or committed files.
2. Do not print secrets in terminal output.
3. Ensure `env.download` stays gitignored (`.env*` already covers it).
4. Set remote secrets via Supabase CLI or dashboard — not in the repo.

---

## What the human already did (manual)

- [x] Resend connected to Supabase (SMTP for auth emails)
- [x] Confirm signup + reset password HTML templates in Supabase dashboard
- [x] Collected env vars in `env.download`
- [ ] **Human will do after you deploy:** end-to-end test (signup → confirm → welcome inbox)

---

## What the agent must implement

### 1. Supabase Edge Function: `send-welcome-email`

Create:

```
supabase/
  functions/
    send-welcome-email/
      index.ts
  migrations/
    YYYYMMDDHHMMSS_welcome_email_trigger.sql
  config.toml          # if missing, init minimal config for functions deploy
```

**Function behavior:**

- Accept `POST` with JSON body: `{ "email": string, "name"?: string }`
- Validate `email` is present
- Call Resend API: `POST https://api.resend.com/emails`
- Use `Deno.env.get('RESEND_API_KEY')` — set in Supabase Edge Function secrets
- Return `200` on success, `4xx/5xx` with JSON error on failure
- Deploy with `--no-verify-jwt` (called from DB trigger with service role, not user JWT)

**Sender (use unless Resend domain config says otherwise):**

```
Project Fit Vizag <noreply@projectfitvizag.com>
```

If that domain is not verified in Resend, document the fallback the human must configure.

**Subject:**

```
Welcome to Project Fit Vizag — your account is ready!
```

**Welcome HTML** — match existing confirm-signup branding:

- Font: Arial, max-width 600px, padding 24px
- Primary button color: `#2563eb`
- Tagline: *Eat clean. Live fit. Delivered with care.*
- Links: `https://www.projectfitvizag.com/menu` (or `/` if no menu route)
- Footer contact: `projectfitvizag@gmail.com` | `7799066991`
- **No** confirm button — account is already verified
- Include: welcome message, browse menu CTA, delivery area note (Vizag), ignore-if-not-you line

Reference confirm-signup style from product (Supabase dashboard template the user already configured).

---

### 2. Postgres trigger on `auth.users`

Add migration SQL that:

1. Ensures **`pg_net`** extension is enabled (`create extension if not exists pg_net with schema extensions;` or `net` schema per Supabase defaults — check project).
2. Creates `public.send_welcome_email_on_confirm()` (or similar name):
   - Fires **AFTER UPDATE** on `auth.users`
   - Condition: `OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL`
   - Calls Edge Function via `net.http_post`:
     - URL: `{SUPABASE_URL}/functions/v1/send-welcome-email`
     - Headers: `Content-Type: application/json`, `Authorization: Bearer {SERVICE_ROLE_KEY}`
     - Body: `{ "email": NEW.email, "name": NEW.raw_user_meta_data->>'name' }`
3. Creates trigger on `auth.users`.

**Do not hardcode the service role key in SQL committed to git.**

Preferred approach:

- Store the service role key in **Supabase Vault** or use a **SQL migration run once** via dashboard where the human pastes the key, **or**
- Use `current_setting('app.settings.service_role_key', true)` if you set a DB config, **or**
- Document that the human runs the final `CREATE OR REPLACE FUNCTION` block in SQL Editor with the key substituted locally (migration file uses placeholder `__SERVICE_ROLE_KEY__` and a `DEPLOY.md` note).

Pick the approach that works with Supabase hosted + this repo; simplest acceptable path: migration with placeholder + short `docs/WELCOME_EMAIL_DEPLOY.md` telling human to replace once in SQL Editor.

**Optional but recommended — idempotency:**

Add to `public.users`:

```sql
welcome_email_sent_at timestamptz
```

Set it from the Edge Function (second call via service role) or skip duplicate sends in trigger by checking a flag. At minimum, trigger condition on first confirm is enough for v1.

---

### 3. Deploy secrets and function

From repo root, with Supabase CLI linked to project `ikxpaosrzkctqvhxihpe`:

```bash
# Read RESEND_API_KEY from env.download — do not echo it
supabase secrets set RESEND_API_KEY="<from env.download>"

supabase functions deploy send-welcome-email --no-verify-jwt
```

If CLI is not linked, document dashboard steps:

1. **Edge Functions → Secrets** → add `RESEND_API_KEY`
2. Deploy function via CLI or Supabase dashboard editor

---

### 4. Enable `pg_net` (if not enabled)

Human may need to enable in **Database → Extensions → pg_net**. Agent should note this in completion summary if migration fails.

---

### 5. Apply migration

```bash
supabase db push
# OR run migration SQL in Supabase SQL Editor
```

---

### 6. Do NOT change (unless explicitly broken)

- Supabase auth email templates (confirm signup / reset password)
- Resend SMTP integration
- `app/api/auth/signup/route.ts` signup flow
- WhatsApp welcome flow

---

## File deliverables checklist

| Deliverable | Path |
|-------------|------|
| Edge Function | `supabase/functions/send-welcome-email/index.ts` |
| SQL migration | `supabase/migrations/*_welcome_email_trigger.sql` |
| Deploy notes | `docs/WELCOME_EMAIL_DEPLOY.md` (short: secrets, SQL, test) |
| Optional schema bump | `welcome_email_sent_at` on `public.users` in migration |

---

## Edge Function reference implementation (starter)

Agent should implement properly; this is the intended shape:

```ts
// supabase/functions/send-welcome-email/index.ts
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Project Fit Vizag <noreply@projectfitvizag.com>";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return new Response(JSON.stringify({ error: "email is required" }), { status: 400 });
  }

  const name = body.name?.trim();
  const html = buildWelcomeHtml(name); // agent implements branded HTML

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "Welcome to Project Fit Vizag — your account is ready!",
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Resend error", data);
    return new Response(JSON.stringify({ error: data }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 });
});
```

---

## Test plan (agent runs where possible; human confirms inbox)

1. **Resend logs:** [Resend → Emails](https://resend.com/emails) — delivery status
2. **Edge Function logs:** Supabase → Edge Functions → `send-welcome-email` → Logs
3. **Manual curl** (use service role from `env.download`, do not commit):

   ```bash
   curl -X POST "https://ikxpaosrzkctqvhxihpe.supabase.co/functions/v1/send-welcome-email" \
     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"<test-email>\",\"name\":\"Test User\"}"
   ```

4. **Full flow:**
   - Sign up with a **new** email on the site
   - Open confirm email → click confirm
   - Verify welcome email arrives within ~1 minute
   - Re-confirm / update user → welcome must **not** send again

---

## Acceptance criteria

- [ ] Edge Function deployed and reachable
- [ ] `RESEND_API_KEY` set in Supabase Edge Function secrets
- [ ] Trigger fires only on first email confirmation
- [ ] Welcome email uses Project Fit Vizag branding
- [ ] No secrets in git
- [ ] Confirm signup / reset password auth emails still work (unchanged)
- [ ] Human can follow `WELCOME_EMAIL_DEPLOY.md` to reproduce deploy

---

## Architecture diagram

```
User clicks "Confirm email" in signup email
              │
              ▼
Supabase Auth sets auth.users.email_confirmed_at
              │
              ▼
Postgres trigger (AFTER UPDATE on auth.users)
              │
              ▼
net.http_post → /functions/v1/send-welcome-email
              │
              ▼
Edge Function → Resend API → Welcome email inbox
```

---

## Handoff message for the human (agent fills in after work)

When done, reply with:

1. What was created/changed (file list)
2. Whether `pg_net` was enabled
3. Whether migration was applied or needs manual SQL Editor run
4. Result of curl test (success/fail, no secrets)
5. Exact steps for human to run one live signup test

---

## Related files in this repo

| File | Relevance |
|------|-----------|
| `env.download` | **Source of truth for secrets** (local only) |
| `supabase/schema.sql` | Existing tables; may extend with `welcome_email_sent_at` |
| `app/api/auth/signup/route.ts` | Signup flow; do not modify for this task |
| `app/api/whatsapp/welcome/route.ts` | Similar “welcome after signup” pattern for WhatsApp |
| `lib/whatsapp.ts` | Welcome template naming reference |

---

## Prompt to paste to the agent

```
Read and implement: C:\projectfitvizag\Projectfitwithdb\docs\AGENT_WELCOME_EMAIL.md

Load all secrets from C:\projectfitvizag\Projectfitwithdb\env.download (never commit or log them).

Implement the post-confirmation welcome email: Edge Function + Postgres trigger + Resend.
Follow the acceptance criteria and deliver WELCOME_EMAIL_DEPLOY.md when done.
```
