# Project Fit Backend

This app uses Next.js route handlers as the backend and Supabase as the database/auth service.

## How it works

- Browser forms call routes like `/api/auth/login` and `/api/orders`.
- Those route files live inside `app/api`.
- The route files talk to Supabase using server-side environment variables.
- Orders are saved in the Supabase `orders` table.
- Razorpay Checkout collects payment after the backend creates a Razorpay order.
- Delivery address and optional browser location coordinates are saved with the order.
- WhatsApp Cloud API sends the welcome template to opted-in users and handles menu replies.
- The chef dashboard reads `/api/orders` every 5 seconds.

## Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run the SQL in `supabase/schema.sql`.
4. In Supabase Project Settings, copy:
   - Project URL
   - anon public key or publishable key
   - service_role secret key or secret key
5. Add those values to Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_SECRET_KEY=your-supabase-secret-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
WHATSAPP_ACCESS_TOKEN=your-meta-whatsapp-cloud-api-token
WHATSAPP_PHONE_NUMBER_ID=your-meta-phone-number-id
WHATSAPP_VERIFY_TOKEN=choose-a-strong-webhook-verify-token
WHATSAPP_APP_SECRET=your-meta-app-secret
WHATSAPP_GRAPH_API_VERSION=v21.0
WHATSAPP_KITCHEN_CONTACT_MESSAGE=Contact ProjectFit Vizag Kitchen:\nPhone: +91 90000 00000\nHours: 8 AM - 9 PM
PROJECTFIT_INTERNAL_API_SECRET=choose-a-long-random-internal-secret
WHATSAPP_ADMIN_TOKEN=choose-a-long-random-admin-token
```

The app accepts either naming style:

- Public key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, or `SUPABASE_PUBLISHABLE_KEY`
- Secret server key: `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- URL: `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`

For local development, create `.env.local` with the same values. Do not commit `.env.local`.
If you are testing preview deploys, make sure the needed variables are added to the `Preview` environment too, not only `Production`.

## Beginner mental model

The frontend is what users see and click. The backend is the trusted part that can safely use secret keys, write to the database, and decide what should happen.

In this project:

- `components/auth/AuthForm.tsx` sends login/signup details to your backend.
- `components/Cart.tsx` sends cart items to your backend when the user places an order.
- `components/Cart.tsx` collects delivery address, opens Razorpay Checkout, and sends payment details for verification.
- `app/api/orders/route.ts` validates the logged-in user, calculates tax/total, saves a pending order, and creates a Razorpay order.
- `app/api/payments/verify/route.ts` verifies the Razorpay signature before marking the order paid.
- `app/api/auth/signup/route.ts` saves WhatsApp opt-in consent in `users`.
- `app/api/whatsapp/welcome/route.ts` sends the approved `welcome_projectfit` template for opted-in users.
- `app/api/webhooks/whatsapp/route.ts` verifies Meta webhooks, logs incoming messages, and replies to menu options.
- `app/admin/whatsapp` shows users, opt-ins, WhatsApp logs, failed deliveries, menu items, and meal plans. Open it with `?token=WHATSAPP_ADMIN_TOKEN`.
- `app/chef/dashboard/page.tsx` shows paid orders from the database.

## WhatsApp setup

1. Create and approve the `welcome_projectfit` template in WhatsApp Manager.
2. Add the WhatsApp environment variables in Vercel.
3. In Meta App Dashboard, set the callback URL to:

```text
https://projectfitvizag.com/api/webhooks/whatsapp
```

4. Use your `WHATSAPP_VERIFY_TOKEN` as the Meta webhook verify token.
5. Subscribe to WhatsApp message and message status webhook fields.

## Current limitations

The chef dashboard is connected to real orders, but it is not protected by an admin login yet. Before using this for a real business, add a chef/admin role check so only staff can see and update all orders.
