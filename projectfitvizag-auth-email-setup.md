# Project Fit Vizag — Auth Email Setup Guide

> **What this is (simple terms):** Setting up **branded transactional emails** — replacing Supabase's default signup/reset emails with your own **Project Fit Vizag** branded messages, sent from your domain via **Resend**.

**Last updated:** June 2026  
**App:** [projectfitvizag.com](https://www.projectfitvizag.com/login)  
**Support email:** [projectfitvizag@gmail.com](mailto:projectfitvizag@gmail.com)

---

## What changes after setup


| Before                                | After                                |
| ------------------------------------- | ------------------------------------ |
| From: `Supabase Auth`                 | From: `Project Fit Vizag`            |
| Email: `noreply@mail.app.supabase.io` | Email: `noreply@projectfitvizag.com` |
| Generic Supabase message              | Your branded confirmation email      |


---

## What you need

1. **Resend account** — sends emails reliably ([resend.com](https://resend.com))
2. **Domain DNS access** — for `projectfitvizag.com` (GoDaddy, Namecheap, Cloudflare, etc.)
3. **Supabase project** — your existing Project Fit backend

**Estimated time:** 30–60 minutes (DNS verification can take 5 min to a few hours)

---

## Phase 1 — Create Resend account

### Step 1.1: Sign up

1. Go to [https://resend.com](https://resend.com)
2. Click **Sign up**
3. Use `projectfitvizag@gmail.com` (or your main email)
4. Verify your email

### Step 1.2: Choose a sender address

Pick one address on **your domain** (not Gmail):

- `noreply@projectfitvizag.com` ← **recommended** for auth emails
- or `hello@projectfitvizag.com`

You will use this in Supabase later.

---

## Phase 2 — Add and verify your domain in Resend

### Step 2.1: Add domain

1. In Resend dashboard → **Domains**
2. Click **Add Domain**
3. Enter: `projectfitvizag.com`
4. Click **Add**

> Resend also supports subdomains like `mail.projectfitvizag.com`. Root domain is fine to start.

### Step 2.2: Copy DNS records

Resend will show records such as:

- **MX** record (for `send`)
- **TXT** record for **SPF**
- **TXT** record(s) for **DKIM**

Keep this tab open.

### Step 2.3: Add DNS records at your domain provider

Log in wherever you manage DNS for `projectfitvizag.com`.

**Example structure** (copy exact values from Resend — yours may differ):


| Type | Host / Name         | Value                                                 |
| ---- | ------------------- | ----------------------------------------------------- |
| MX   | `send`              | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| TXT  | `send`              | `v=spf1 include:amazonses.com ~all`                   |
| TXT  | `resend._domainkey` | long DKIM string from Resend                          |


**Important:**

- Host is often just `send`, not the full `send.projectfitvizag.com` (depends on provider)
- Do **not** add `http://` anywhere
- TTL: use Automatic or 3600

**Provider-specific guides:**

- [Namecheap + Resend](https://resend.com/docs/knowledge-base/namecheap)
- [Cloudflare + Resend](https://resend.com/docs/knowledge-base/cloudflare)
- [GoDaddy + Resend](https://resend.com/docs/knowledge-base/godaddy)

### Step 2.4: Verify in Resend

1. Back in Resend → your domain
2. Click **Verify DNS Records**
3. Wait until status is **Verified** (often 5–15 minutes; sometimes up to 72 hours)

You cannot send production auth emails until status is **Verified**.

Docs: [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction)

---

## Phase 3 — Create Resend API key

1. Resend → **API Keys**
2. Click **Create API Key**
3. Name: `Supabase Project Fit`
4. Permission: **Sending access** (or Full access)
5. Domain: select `projectfitvizag.com` if asked
6. Click **Create**
7. **Copy the key immediately** — you won't see it again

Example shape: `re_xxxxxxxxxx`

Store it in a password manager. This key is your **SMTP password**.

---

## Phase 4 — Connect Resend to Supabase (SMTP)

### Step 4.1: Open Supabase SMTP settings

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your **Project Fit** project
3. Left sidebar → **Authentication**
4. Under **Notifications** → **Email** → **SMTP Settings**

### Step 4.2: Enable custom SMTP

Toggle **Enable Custom SMTP** ON.

### Step 4.3: Fill in these fields

From [Resend Supabase SMTP docs](https://resend.com/docs/send-with-supabase-smtp):


| Supabase field   | Value                          |
| ---------------- | ------------------------------ |
| **Sender name**  | `Project Fit Vizag`            |
| **Sender email** | `noreply@projectfitvizag.com`  |
| **Host**         | `smtp.resend.com`              |
| **Port**         | `465`                          |
| **Username**     | `resend`                       |
| **Password**     | Your Resend API key (`re_...`) |


**Notes:**

- Resend uses port **465** (not 587)
- Username is literally the word `resend`
- Password is the API key, **not** your Resend login password
- Host is `smtp.resend.com` only — no `https://` or `http://`

### Step 4.4: Save

Click **Save**.

---

## Phase 5 — Customize email templates in Supabase

SMTP changes **who** sends the email. Templates change **what** the email says.

### Step 5.1: Open templates

Supabase → **Authentication** → **Email Templates**

### Step 5.2: Edit "Confirm signup"

**Subject:**

```
Confirm your email — Project Fit Vizag
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
  <h2 style="color: #1a1a1a;">Welcome to Project Fit Vizag!</h2>

  <p>Thanks for signing up for health & diet meal delivery.</p>

  <p>Please confirm your email address to finish creating your account:</p>

  <p style="margin: 32px 0;">
    <a href="https://www.projectfitvizag.com/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/login"
       style="background-color: #2563eb; color: white; padding: 14px 28px;
              text-decoration: none; border-radius: 6px; display: inline-block;">
      Confirm email address
    </a>
  </p>

  <p style="color: #666; font-size: 14px;">
    If you didn't sign up for Project Fit Vizag, you can safely ignore this email.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #888; font-size: 13px;">
    Project Fit Vizag<br>
    Eat clean. Live fit. Delivered with care.<br>
    projectfitvizag@gmail.com | 7799066991<br>
    <a href="https://www.projectfitvizag.com">www.projectfitvizag.com</a>
  </p>
</body>
</html>
```

> Use `{{ .TokenHash }}` with the app's `/auth/confirm` callback. Do **not** use `{{ .ConfirmationURL }}` for signup confirmation, because Supabase's default redirect can place `access_token` and `refresh_token` in the browser URL hash.

### Step 5.3: Edit other templates (recommended)

Apply the same branding to:

- **Reset Password**
- **Magic Link** (if used)
- **Change Email Address**

---

## Phase 6 — Fix Supabase URL settings

Wrong URLs break confirmation links.

### Site URL

Supabase → **Authentication** → **URL Configuration**


| Field        | Value                             |
| ------------ | --------------------------------- |
| **Site URL** | `https://www.projectfitvizag.com` |


### Redirect URLs

Add these if not already present:

```
https://www.projectfitvizag.com/**
https://www.projectfitvizag.com/login
```

Add your actual auth callback path if your app uses something like `/auth/callback`.

---

## Phase 7 — Test everything

### Test signup

1. Open [https://www.projectfitvizag.com/login](https://www.projectfitvizag.com/login)
2. Sign up with a real email you can access
3. Check inbox (and spam folder)

### Confirm the email looks correct

- **From:** Project Fit Vizag
- **Address:** `noreply@projectfitvizag.com`
- **Subject:** your custom subject
- **Body:** Project Fit branding
- **Button:** works and confirms the account

### Test password reset

1. Click "Forgot password" on login
2. Enter test email
3. Confirm reset email arrives and link works

### Check Resend logs

Resend → **Emails** → verify sent / delivered / bounced status

---

## Phase 8 — Optional improvements

### Rate limits

Supabase may cap auth emails (~30/hour initially with custom SMTP).

Supabase → **Authentication** → **Rate Limits** — adjust once you go live.

### DMARC (later)

After SPF + DKIM work, add a DMARC TXT record for better deliverability. Resend shows suggested values under your domain.

### Gmail vs Resend roles

- **Resend:** signup confirmations, password resets, magic links
- **[projectfitvizag@gmail.com](mailto:projectfitvizag@gmail.com):** customer support / replies

---

## Quick reference card

```
RESEND
  Domain:     projectfitvizag.com → Verified
  API Key:    re_xxxxxxxx (used as SMTP password)

SUPABASE SMTP
  Sender name:  Project Fit Vizag
  Sender email: noreply@projectfitvizag.com
  Host:         smtp.resend.com
  Port:         465
  Username:     resend
  Password:     <Resend API key>

SUPABASE URLS
  Site URL: https://www.projectfitvizag.com
```

---

## Troubleshooting


| Problem                           | Likely fix                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------- |
| "Error sending confirmation mail" | Domain not verified in Resend; wrong API key; sender email not on verified domain |
| Email not arriving                | Check spam; check Resend → Emails for bounce reason                               |
| Confirmation link doesn't work    | Fix Site URL and Redirect URLs in Supabase                                        |
| Still shows "Supabase Auth"       | Custom SMTP not saved; still using default Supabase mailer                        |
| SMTP connection error             | Host must be `smtp.resend.com`, port `465`, no `http://` prefix                   |


---

## Checklist

- [ ] Create Resend account
- [ ] Add `projectfitvizag.com` in Resend
- [ ] Add DNS records at domain provider
- [ ] Wait for **Verified** status in Resend
- [ ] Create Resend API key
- [ ] Enable Custom SMTP in Supabase
- [ ] Paste Resend SMTP credentials
- [ ] Customize email templates
- [ ] Set Site URL + redirect URLs
- [ ] Test signup
- [ ] Test password reset

---

## Useful links

- [Resend + Supabase getting started](https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase)
- [Resend SMTP with Supabase](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase custom SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend domain management](https://resend.com/docs/dashboard/domains/introduction)

---

## Alternative: Gmail SMTP (not recommended for production)

If you need a quick temporary fix before Resend is set up:


| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Sender name  | `Project Fit Vizag`                                   |
| Sender email | `projectfitvizag@gmail.com`                           |
| Host         | `smtp.gmail.com`                                      |
| Port         | `587`                                                 |
| Username     | `projectfitvizag@gmail.com`                           |
| Password     | Gmail **App Password** (requires 2-Step Verification) |


Gmail limits (~500 emails/day) and worse deliverability make Resend the better long-term choice.
