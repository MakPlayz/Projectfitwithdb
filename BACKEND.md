# Project Fit Backend

This app uses Next.js route handlers as the backend and Supabase as the database/auth service.

## How it works

- Browser forms call routes like `/api/auth/login` and `/api/orders`.
- Those route files live inside `app/api`.
- The route files talk to Supabase using server-side environment variables.
- Orders are saved in the Supabase `orders` table.
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
- `app/api/orders/route.ts` validates the logged-in user, calculates tax/total, and saves the order.
- `app/chef/dashboard/page.tsx` shows saved orders from the database.

## Current limitations

The chef dashboard is connected to real orders, but it is not protected by an admin login yet. Before using this for a real business, add a chef/admin role check so only staff can see and update all orders.
