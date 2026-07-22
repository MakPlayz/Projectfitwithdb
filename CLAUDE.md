# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The line above imports `AGENTS.md`: this is **Next.js 16 App Router** with breaking
> changes vs. older versions. Consult `node_modules/next/dist/docs/` (when present) before
> writing framework code, and don't assume older Next.js/React idioms.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config, next/core-web-vitals + next/typescript)
```

There is **no test runner** — no jest/vitest/playwright config exists. Do not invent test
commands. Verify changes with `npm run build` and `npm run lint`.

Local dev without Supabase env vars falls back to **mock auth** (`lib/mock-auth.ts`,
gated by `canUseMockAuth()` — only when `NODE_ENV !== 'production'` and Supabase is
unconfigured). Copy `.env.example` → `.env.local` for real backend behavior.

## Stack

- **Next.js 16.2 / React 19.2**, TypeScript `strict`. Path alias `@/*` → repo root.
- **Supabase** (Postgres + Auth) as the datastore — see data-access note below.
- **Zustand** for client state (`store/`). **CSS Modules** (`*.module.css`) are the
  dominant styling approach; Tailwind v4 (`@tailwindcss/postcss`) + `globals.css` also
  present. Use `cn()` from `lib/utils.ts` to compose classes.
- Animation: `framer-motion`/`motion`, `gsap`, `three`/`ogl`. Theme via `next-themes`.

## Architecture

**The backend is `app/api/**` route handlers.** There is no separate server. Browser code
calls these routes; the routes hold the secrets and talk to Supabase.

**Supabase is accessed via raw REST, not `@supabase/supabase-js`** (that package is not a
dependency). All DB access goes through `lib/supabase-rest.ts` helpers using **PostgREST
query syntax** in the path (e.g. `/orders?user_id=eq.${id}&select=*&order=created_at.desc`):

- `supabaseRestFetch` / `supabaseAuthAdminFetch` use the **service-role key** — server-only.
- `supabaseAuthFetch` uses the public/anon key.
- Env vars accept multiple naming styles (anon *or* publishable, service_role *or* secret);
  always read them through the getters in `supabase-rest.ts`, never `process.env` directly.

**Auth is custom and client-managed** (`lib/auth-client.ts`), not middleware:

- Sessions live in `localStorage` under two scopes — customer (`projectfit.session`) and
  chef (`projectfit.chef.session`) — each refreshed via `/api/auth/session`.
- Client requests attach bearer tokens via `getAuthHeaders()` / `getChefAuthHeaders()`.
- Route handlers validate the caller with `getUserFromAccessToken(token)`; admin/chef
  routes additionally call `requireAdminUser()` (`lib/admin-auth.ts`), which checks the
  email against `ADMIN_EMAILS`.
- Chef **pages** (`/chef/dashboard`) are gated by a signed HMAC HTTP-only cookie
  (`lib/admin-session.ts`, cookie `projectfit.chef.admin`) — separate from the API bearer check.
- There is **no `middleware.ts`.** Route protection for pages is enforced client-side by
  `AuthGuard` inside `components/layout/AppChrome.tsx`; the protected path list lives in
  `lib/protected-routes.ts`.

**Pricing is server-authoritative.** Never trust client-supplied `subtotal`/`totalPrice`.
`app/api/orders/route.ts` recomputes everything via `getTrustedCheckoutPricing()`
(`lib/checkout-pricing.ts`) from server-side menu/plan data before saving.

**Delivery is gated by serviceable pincodes** (`lib/serviceable-pincodes.ts`, seeded from
`NEXT_PUBLIC_SERVICEABLE_PINCODES`). Some pincodes are "included delivery", others incur a
separate parcel fare — reflected in order messages.

**Checkout / payment** currently uses a **manual WhatsApp flow**: the order route creates a
`new`/`pending` order and returns a `wa.me` link (`buildManualPaymentMessage`, phone from
`MY_NUMBER`) for the customer to send to the kitchen. Razorpay verification code also exists
(`app/api/payments/verify`, referenced in `BACKEND.md`).

**WhatsApp Cloud API** (`lib/whatsapp.ts`) drives customer messaging: welcome templates,
menu/specials/meal-plan replies, and order-lifecycle notifications. Webhook at
`app/api/webhooks/whatsapp/route.ts` verifies Meta signatures with `WHATSAPP_APP_SECRET`.
Admin messaging console at `/admin/whatsapp` (open with `?token=WHATSAPP_ADMIN_TOKEN`).

**Rate limiting** (`lib/rate-limit.ts`) is **in-memory per process** — it does not persist
across serverless instances or redeploys. Don't rely on it for hard guarantees.

## Directory map

- `app/` — pages + `app/api/**` route handlers (the backend). Client components are `'use client'`.
- `components/` — feature-grouped UI (`auth/`, `home/`, `diet/`, `hero/`, `ui/`, `layout/`),
  each typically paired with a `*.module.css`.
- `lib/` — server + shared logic: Supabase REST, auth, pricing, WhatsApp, pincodes, admin session.
- `store/` — Zustand stores (`cartStore`, `authModalStore`, `orderStore`).
- `data/` — static catalog (`diets.ts` is the large source of program/plan content; `menu.ts`).
- `supabase/` — `schema.sql` (base), `migrations/` (timestamped), `functions/` (Deno edge
  functions for order/welcome emails), `config.toml`.
- `docs/`, `BACKEND.md`, `projectfit-vizag-auth-email-setup.md` — setup/integration guides.

Key tables: `orders`, `users`, `customer_profiles`, `menu_items`, `meal_plans`,
`program_plan_overrides`, `checkout_intents`, `free_sample_device_claims`,
`plan_pause_requests`, `homepage_ads`/`homepage_ad_settings`, `order_invoices`,
`customer_feedback`, `whatsapp_message_logs`.

## Conventions & gotchas

- Security headers / CSP are centralized in `next.config.ts` — new external hosts (images,
  scripts, connect targets) must be added to the CSP allowlist there or they'll be blocked.
- Free samples: one per account **and** one per device (`free_sample_device_claims`), and
  must be ordered separately from paid plans (see order-route guards).
- When adding a DB column/table, add a timestamped migration in `supabase/migrations/` and
  keep `supabase/schema.sql` consistent.
