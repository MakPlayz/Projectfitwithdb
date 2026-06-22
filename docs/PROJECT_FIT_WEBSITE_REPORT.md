# Project Fit Website - Complete Technical And Product Report

Date: 2026-06-22  
Repository: `Projectfitwithdb`  
Framework: Next.js App Router with React, TypeScript, Supabase, WhatsApp Cloud API, and CSS Modules.

## 1. Executive Summary

Project Fit is a diet-plan subscription website for customers in Vizag. It presents specialized health and nutrition programs, lets users create accounts, complete a health profile, choose day/week/month plans or free samples, save delivery addresses, place orders through a WhatsApp checkout flow, and track their plan status. It also includes a chef/admin portal where staff can approve orders, manage menus and pricing, view customers, track WhatsApp conversations, manage free samples, handle half payments, and see a delivery calendar.

The website is built as a full-stack Next.js application:

- The frontend is implemented with React components under `app/` and `components/`.
- The backend is implemented with Next.js Route Handlers under `app/api/`.
- Supabase is used for authentication, database storage, auth user lookup, and edge email functions.
- WhatsApp Cloud API is used for order confirmation messages, payment instructions, templates, incoming webhook processing, free-sample delivery confirmation, and chef replies.
- Zustand is used for client-side cart and modal state.
- CSS Modules plus global CSS are used for visual design.
- Framer Motion and custom UI components are used for animation and premium presentation.

The main product flow is:

1. User lands on the home page.
2. User browses programs.
3. Protected program pages redirect unauthenticated users to signup/login.
4. User signs up or logs in.
5. User completes profile details.
6. User chooses a plan or free sample.
7. Cart collects delivery address, start date, and payment option.
8. Backend validates user, profile, address, duplicate order rules, and trusted pricing.
9. Backend creates a checkout intent with a unique WhatsApp code.
10. User sends the generated WhatsApp message.
11. WhatsApp webhook converts the checkout intent into an order.
12. Chef portal verifies payment and activates the plan.
13. Customer tracks the active plan in My Plan.
14. Active week/month users can pause meals from eligible dates.
15. Chef calendar shows who should receive meals for upcoming dates.

## 2. Technology Stack

### Frontend

- Next.js `16.2.1`
- React `19.2.4`
- TypeScript
- CSS Modules for component styling
- Global CSS in `app/globals.css`
- Framer Motion and Motion for UI animation
- Lucide React icons for consistent interface iconography
- Next Image for optimized image rendering
- Zustand for cart/auth modal local state

### Backend

- Next.js App Router Route Handlers in `app/api/**/route.ts`
- Supabase Auth via REST endpoints
- Supabase PostgREST for database operations
- Supabase Auth Admin API for chef/admin overview user listing
- WhatsApp Cloud API through direct Graph API calls
- Supabase Edge Function for welcome email

### Database

Supabase Postgres with SQL schema and migrations:

- `supabase/schema.sql`
- `supabase/migrations/*.sql`

Important tables:

- `users`
- `customer_profiles`
- `orders`
- `menu_items`
- `meal_plans`
- `whatsapp_message_logs`
- `customer_feedback`
- `free_sample_device_claims`
- `checkout_intents`
- `program_plan_overrides`
- `plan_pause_requests`

### Build And Tooling

Scripts in `package.json`:

- `npm run dev`: start dev server.
- `npm run build`: production Next build.
- `npm run start`: start production build.
- `npm run lint`: ESLint.

## 3. Top-Level Project Structure

### `app/`

Contains all App Router pages and API routes.

Key groups:

- Marketing and customer pages: `/`, `/menu`, `/profile`, `/my-plan`, program pages.
- Auth pages: `/login`, `/signup`, `/auth/callback`, `/auth/confirm`.
- Chef portal pages: `/chef`, `/chef/signup`, `/chef/dashboard`.
- Legal pages: `/terms`, `/privacy`.
- API backend: `/api/**`.

### `components/`

Reusable UI and feature components:

- Auth forms and guards.
- Cart and delivery location picker.
- Navbar/footer/layout chrome.
- Diet cards and diet page template.
- Hero and home page sections.
- Notifications button.
- UI animation components.

### `lib/`

Shared backend/frontend logic:

- Auth session management.
- Supabase REST helpers.
- WhatsApp helpers.
- Checkout pricing and checkout intent logic.
- Plan duration and pause helpers.
- Profile storage.
- Delivery pincode validation.
- Program plan override loading.

### `data/`

Static program catalog:

- `data/diets.ts`: diet categories, plan definitions, nutrition copy, static images, static fallback pricing.
- `data/menu.ts`: legacy menu type and empty local fallback menu.

### `store/`

Zustand stores:

- `cartStore.ts`: cart items, open/close state, totals.
- `authModalStore.ts`: leaf auth modal state.
- `orderStore.ts`: older local order store.

### `supabase/`

Database schema, migrations, and edge functions.

### `public/`

Images, PDFs, logo assets, payment QR image.

## 4. Application Shell And Layout

### Root Layout

File: `app/layout.tsx`

The root layout:

- Imports global CSS.
- Sets metadata title and description.
- Wraps every page in `AppChrome`.

This keeps shared UI like navbar, background, footer, cart, auth guard, and notification button in one place.

### App Chrome

File: `components/layout/AppChrome.tsx`

`AppChrome` decides which shell to render based on route:

- For normal customer routes:
  - `AuthUrlScrubber`
  - `BackgroundDecor`
  - `Navbar`
  - `AuthGuard`
  - `Footer`
  - `Cart`
  - `NotificationsButton`
- For `/chef` routes:
  - Only `AuthUrlScrubber` and page content.
  - Chef portal intentionally does not show customer navbar/cart/footer.

This creates two product experiences:

- Customer-facing sales/subscription experience.
- Staff-facing kitchen operations console.

## 5. Global UI/UX Design System

The UI is built with:

- Global variables and shared classes in `app/globals.css`.
- Component-specific CSS Modules.
- Lucide icons.
- Motion animations.
- Real food/category images in `public/images/**`.

### Visual Design Direction

The customer site uses a premium health/nutrition brand style:

- Large visual hero.
- Food imagery.
- Soft cards.
- Green/orange/purple category accents.
- Clear CTA buttons.
- Program cards with image-driven navigation.
- Animated entrance transitions.

The chef portal uses a denser dashboard style:

- Sidebar/tab navigation.
- Compact cards.
- Metrics.
- Search.
- Operational panels.
- Order details with action forms.
- Tables/cards for staff workflows.

### Shared UI Classes

Common classes such as `container`, `section-label`, `section-title`, `section-subtitle`, `btn-primary`, and `btn-secondary` provide consistent spacing, headings, and CTAs.

### Responsive Behavior

The navbar has:

- Desktop dropdown programs menu.
- Mobile hamburger menu.
- Body scroll lock when mobile menu is open.

Cards and grids use CSS Modules and responsive grid patterns to adapt across desktop and mobile.

## 6. Home Page Flow

Files:

- `app/page.tsx`
- `components/hero/HeroSection.tsx`
- `components/home/PlanOptionsSection.tsx`
- `components/home/FeaturesSection.tsx`
- `components/home/HowItWorks.tsx`

The home page is assembled from four major sections:

1. `HeroSection`
2. `PlanOptionsSection`
3. `FeaturesSection`
4. `HowItWorks`

### Hero Section

`HeroSection` uses `AnimatedMarqueeHero` and a program-card grid.

Hero content includes:

- Tagline: fresh daily, weekly, monthly plans.
- Main title: Project Fit.
- Description of diet programs.
- Primary CTA: Explore Programs.
- Secondary CTA: How It Works.
- Rotating/marquee food images.

Below the hero, the site renders program cards from `dietCategories`.

### Program Cards

File: `components/diet/DietCategoryCard.tsx`

Each card:

- Uses category image.
- Shows icon, title, tagline, calorie target.
- Uses accent colors from the diet data.
- Links to the program page if user is authenticated.
- Redirects to signup with `next` param if unauthenticated.

This is how the site turns the home page into a conversion path: users see the program, click, and are guided to authentication if needed.

## 7. Program Catalog And Program Pages

Files:

- `data/diets.ts`
- `app/weight-loss/page.tsx`
- `app/mass-gain/page.tsx`
- `app/pregnancy/page.tsx`
- `app/pcos-pcod/page.tsx`
- `app/diabetes/page.tsx`
- `app/kids/page.tsx`
- `components/diet/DietPageTemplate.tsx`
- `lib/program-plan-overrides.ts`

### Diet Data Model

`data/diets.ts` defines:

- `DietSlug`
- `DietPlan`
- `DietMeal`
- `DietCategory`
- `dietCategories`
- `getDietBySlug`

Each program has:

- Slug and route.
- Title and short title.
- Tagline and description.
- Calorie target.
- PDF URL.
- Image.
- Accent color.
- Gradient.
- Icon key.
- Plan definitions.
- Meals and free samples.
- Macro cards.
- Nutrition highlights.

### Programs

The six current programs are:

- Weight Loss
- Mass Gain
- Pregnancy Nutrition
- PCOS / PCOD Diet
- Diabetes-Friendly Diet
- Kids Section

### Program Page Loading

Each program page calls `getDietWithPlanOverrides(slug)`.

That helper:

1. Loads static diet data from `data/diets.ts`.
2. Loads active program plan overrides from Supabase.
3. Loads active menu items for that program.
4. Loads active free sample items for that program.
5. Maps DB menu items into `DietMeal` objects.
6. Applies plan override values:
   - Name
   - Duration
   - Price
   - Highlight
   - Active/inactive status

This means the website has static fallback content, but chef/admin can update actual menu items and plan pricing from the portal.

### Diet Page Template

`DietPageTemplate` renders:

- Program hero.
- Macro profile.
- Day plans.
- Week plans.
- Month plans.
- Featured meals.
- Free samples.
- Final CTA.

Plan grouping logic:

- Day plans: `duration === '1 day'`
- Week plans: `duration === '6 days'`
- Month plans: plan ID contains `-month-` or `-custom-`

### Adding A Plan To Cart

When a customer clicks Add to Cart:

1. Existing cart is cleared for plan checkout.
2. A `CartItem` is created with:
   - ID
   - Name
   - Type `plan`
   - Program slug
   - Base price
   - Quantity 1
   - Image
   - Total price
3. Cart drawer is opened.

Free samples:

- Can only be added if cart is empty.
- Use item type `free_sample`.
- Price is zero.
- Program slug is saved.

The UI blocks mixing free samples and plans in the same cart.

## 8. Authentication System

Files:

- `components/auth/AuthForm.tsx`
- `components/auth/AuthGuard.tsx`
- `components/auth/AuthUrlScrubber.tsx`
- `lib/auth-client.ts`
- `lib/mock-auth.ts`
- `lib/protected-routes.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/auth/google/route.ts`
- `app/auth/callback/route.ts`
- `app/api/auth/oauth-session/route.ts`
- `app/auth/callback/complete/AuthCallbackCompleteClient.tsx`
- `app/auth/confirm/route.ts`

### Auth Modes

The site supports:

- Email/password signup.
- Email/password login.
- Google OAuth login.
- Local mock auth when Supabase is not configured and environment is not production.
- Separate chef login using the same Supabase auth but a different localStorage session key.

### Client Session Storage

`lib/auth-client.ts` stores session data in localStorage.

Customer session key:

- `projectfit.session`

Chef session key:

- `projectfit.chef.session`

Session shape:

- `accessToken`
- `refreshToken`
- `expiresAt`
- `user`

The client:

- Saves session after login/signup/OAuth.
- Reads session before protected route access.
- Refreshes session if token is expiring soon.
- Clears invalid sessions.
- Emits browser events so navbar/auth guard react to auth changes.

### Token Validation

`isUsableAccessToken` checks JWT shape, base64 characters, signature presence, and rejects `alg: none`.

Local mock auth was updated to use an `HS256` header and a long local signature string so local sessions pass the sanity check.

### Signup Flow

`AuthForm` collects:

- Name
- Email
- Password
- WhatsApp phone
- Age
- Height
- Weight
- Gender
- Health notes
- WhatsApp consent
- Terms/privacy consent

`app/api/auth/signup/route.ts`:

1. Rate limits signup by IP.
2. Validates required fields.
3. Formats WhatsApp phone.
4. Validates age, height, weight, and gender.
5. Calls Supabase signup.
6. Inserts app user row in `users`.
7. Inserts `customer_profiles`.
8. Builds recommended path and coach notes.
9. Sends welcome WhatsApp/email where configured.

If Supabase email confirmation is required and no access token is returned, the UI tells the user to confirm email and then sign in.

### Login Flow

`app/api/auth/login/route.ts`:

1. Validates email and password.
2. Uses mock auth in local fallback mode.
3. Calls Supabase password grant.
4. Returns Supabase session.

Client saves the session and redirects to the intended next path.

### Google OAuth Flow

Google OAuth uses PKCE:

1. `/api/auth/google` generates verifier, challenge, and state.
2. Verifier and state are stored in HTTP-only cookies.
3. User is redirected to Supabase Google OAuth.
4. Supabase redirects to `/auth/callback`.
5. Callback validates state and code.
6. Callback exchanges code for session.
7. Session is encoded into short-lived HTTP-only chunk cookies.
8. `/auth/callback/complete` reads the session via `/api/auth/oauth-session`.
9. Client saves session to localStorage.

`AuthUrlScrubber` removes sensitive tokens from URL hashes if they appear.

### Protected Routes

`lib/protected-routes.ts` protects:

- `/menu`
- `/chef/dashboard`
- Program pages:
  - `/weight-loss`
  - `/mass-gain`
  - `/diabetes`
  - `/pcos-pcod`
  - `/pregnancy`
  - `/kids`

`AuthGuard`:

- Allows auth pages.
- Redirects unauthenticated users from protected pages.
- Checks profile completeness.
- Opens profile-completion modal if needed.
- Syncs complete local profile data to the server when possible.

## 9. Profile System

Files:

- `app/profile/page.tsx`
- `app/profile/ProfilePageClient.tsx`
- `app/api/profile/route.ts`
- `components/auth/ProfileCompletionModal.tsx`
- `lib/profile-storage.ts`
- `lib/customer-profile.ts`

### Profile Data

Customer profile includes:

- Full name
- Age
- Gender
- Height
- Weight
- Activity level
- Primary goal
- Health focus
- Diet preference
- Allergies
- Health notes
- Optional medical report file
- Saved delivery address
- Recommended path
- Recommendation summary
- Coach notes
- Completion flag

### Local Profile Storage

`lib/profile-storage.ts` stores profile values in localStorage under:

- `projectfit.profile`

This supports:

- Pre-filling signup/profile forms.
- Carrying incomplete profile data across auth steps.
- Saving delivery address locally for checkout.

### Profile Page UI

`ProfilePageClient` renders:

- Account hero.
- Avatar/profile image upload.
- Personal details form.
- Height unit toggle between cm and feet/inches.
- Health notes.
- Optional medical report upload.
- Saved delivery location.
- Location picker.
- Pause meals section.
- Feedback section.

### Medical Report

Allowed report types:

- PDF
- JPG
- PNG
- WebP

Max size:

- 1.5 MB

The file is read as a data URL and saved in `customer_profiles.medical_report_file_data`.

### Profile API

`GET /api/profile`:

- Authenticates user.
- Fetches `customer_profiles`.
- Fetches app `users` row for phone/name.
- Returns both.

`POST /api/profile`:

- Authenticates user.
- Validates required profile fields.
- Validates WhatsApp phone.
- Preserves existing delivery address and medical report when a request omits those fields.
- Upserts app user row.
- Upserts customer profile row.
- Recomputes recommendation path, summary, and coach notes.

This preservation logic matters because profile completion modals and background sync can send partial profile data.

## 10. Recommendation Logic

File: `lib/customer-profile.ts`

The recommendation system is simple rule-based logic:

- Kids health focus maps to `kids`.
- Pregnancy maps to `pregnancy`.
- PCOS/PCOD maps to `pcos-pcod`.
- Diabetes maps to `diabetes`.
- Muscle gain goal maps to `mass-gain`.
- Weight loss goal maps to `weight-loss`.
- Otherwise maps to `menu`.

Coach notes are generated from:

- Primary goal.
- Activity level.
- Health focus.
- Diet preference.

The recommendation summary is text designed to show in profile/menu pages and chef user detail.

## 11. Delivery Location System

Files:

- `components/LocationPickerModal.tsx`
- `components/Cart.tsx`
- `app/profile/ProfilePageClient.tsx`
- `lib/delivery-address-validation.ts`
- `lib/serviceable-pincodes.ts`
- `app/api/public-config/route.ts`

### Serviceable Pincodes

`lib/serviceable-pincodes.ts` defines:

- Default serviceable pincodes.
- Included delivery pincodes.
- Runtime serviceable pincode override.

Included delivery pincodes:

- `530041`
- `530045`
- `530048`

Other deliverable pincodes may require Rapido/parcel fare.

### Public Config

`GET /api/public-config` returns:

- Google Maps browser API key.
- Serviceable pincodes.
- Included delivery pincodes.

`usePublicConfig` loads this into runtime frontend config.

### Location Picker

`LocationPickerModal`:

- Uses browser geolocation and/or selected map/geocode data.
- Extracts address components.
- Extracts pincode.
- Warns if pincode is outside serviceable areas.
- Allows user to manually complete missing pincode.

### Address Validation

Frontend cart validates:

- Address line.
- City.
- 6-digit pincode.
- Deliverable pincode.
- 10-digit Indian mobile number.

Backend validates again:

- Complete address.
- Deliverable pincode.
- Google geocode pincode match where configured.

The backend allows neighboring Google postal code mismatches if both the entered and returned pincodes are deliverable. This avoids false rejection in adjacent Vizag localities.

### Saved Address

Saved delivery location is stored:

- Locally in `projectfit.profile`.
- Remotely in `customer_profiles.delivery_address`.

Cart loads local address first for fast UX, then fetches `/api/profile` and merges saved remote address.

## 12. Cart And Checkout Flow

Files:

- `components/Cart.tsx`
- `store/cartStore.ts`
- `app/api/checkout-intents/route.ts`
- `lib/checkout-pricing.ts`
- `lib/checkout-intents.ts`

### Cart State

`store/cartStore.ts` stores:

- `items`
- `isOpen`
- `addItem`
- `removeItem`
- `updateQuantity`
- `clearCart`
- `toggleCart`
- `getTotal`
- `getCount`

Current business rule:

- Only one item at a time.
- Quantity must be 1.
- Free samples and paid plans cannot mix.

### Cart UI

The cart drawer shows:

- Selected plan or sample.
- Image.
- Price.
- Remove button.
- Delivery address fields.
- Detect/change location.
- Pincode delivery notice.
- Phone field.
- Payment option for monthly plans.
- Plan start date for paid plans.
- Due-now summary.
- Place Order button.

### Start Date Logic

Frontend minimum start date:

- Tomorrow.

Backend enforces:

- Valid `YYYY-MM-DD`.
- Date from tomorrow onward in Asia/Kolkata.

### Half Payment UI

Half payment is available only when:

- Checkout is not free sample.
- Cart item is detected as monthly plan.

Frontend shows:

- Pay full.
- Pay half now.
- Remaining amount later.

Backend also rechecks monthly plan eligibility.

### Trusted Checkout Pricing

File: `lib/checkout-pricing.ts`

This is important security logic.

The browser sends cart data, but the backend does not trust the browser price. Instead:

1. It reads the cart item.
2. Extracts the program slug.
3. Loads the server-side diet catalog and DB plan overrides.
4. Finds the matching plan or free sample.
5. Recalculates:
   - Item name
   - Base price
   - Subtotal
   - Tax
   - Total
6. Returns trusted normalized items.

This prevents a user from editing browser payloads to create a cheaper order.

### Checkout Intent Creation

`POST /api/checkout-intents`:

1. Requires login.
2. Validates cart item count.
3. Gets trusted pricing.
4. Validates free sample or plan rules.
5. Validates requested start date.
6. Validates free-sample device ID.
7. Validates delivery address and pincode.
8. Validates profile completion.
9. Checks duplicate free sample claims.
10. Checks duplicate active/pending paid plan per program.
11. Calculates payable now and remaining amount.
12. Creates a checkout intent in Supabase.
13. Builds a WhatsApp URL containing a checkout code.
14. Returns checkout intent and WhatsApp URL.

The checkout intent code format:

- `PFI-XXXXXX`

It is generated randomly using a reduced alphabet that avoids ambiguous characters.

## 13. WhatsApp Checkout And Order Creation

Files:

- `lib/checkout-intents.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `lib/whatsapp.ts`

### Why Checkout Intents Exist

The site uses WhatsApp as the final manual confirmation channel. A customer starts checkout on the website, but an actual order is created only after the user sends the WhatsApp message containing the checkout code.

This gives Project Fit:

- A clear customer-initiated WhatsApp thread.
- A payment communication channel.
- A way to verify the sender phone number.
- A manual payment workflow.

### Checkout Intent Fields

`checkout_intents` stores:

- Code
- User ID
- Phone
- Customer name
- Items
- Subtotal, tax, total
- Payment option
- Payable now
- Remaining amount
- Order type
- Delivery address
- Requested start date
- Free sample device ID
- Status
- Linked order ID
- WhatsApp sender details
- Expiry time

### WhatsApp Message

The checkout message includes:

- User ID
- Checkout code
- Name
- Phone
- Pincode
- Plan amount
- Payment option
- Amount due now
- Remaining amount if half payment
- Requested start date
- Delivery note
- Plan/items

The user is told not to edit the message.

### Webhook Conversion

`POST /api/webhooks/whatsapp`:

1. Rate limits incoming webhook requests.
2. Verifies Meta signature.
3. Parses incoming WhatsApp payload.
4. Logs incoming messages.
5. Handles status updates for outgoing messages.
6. Handles free sample delivery buttons.
7. Detects checkout code in incoming text/caption/button title.
8. Calls `convertCheckoutIntentFromWhatsApp`.

`convertCheckoutIntentFromWhatsApp`:

1. Finds checkout intent by code.
2. Rejects missing, expired, converted, or inactive intents.
3. Checks that WhatsApp sender phone matches intent phone or delivery phone.
4. Checks free sample duplicates.
5. Checks active/pending paid plan duplicates.
6. Inserts into `orders`.
7. Inserts free sample device claim when applicable.
8. Marks checkout intent as converted.
9. Returns created order.

After conversion:

- Free sample orders receive contact instructions.
- Paid plans receive payment instructions and QR image.

## 14. Order Lifecycle

Files:

- `app/api/orders/[id]/status/route.ts`
- `app/chef/dashboard/page.tsx`
- `lib/plan-duration.ts`
- `lib/whatsapp.ts`

### Order Statuses

Supported order statuses:

- `new`
- `confirmed`
- `preparing`
- `ready`
- `completed`
- `cancelled`

Payment statuses:

- `pending`
- `paid`
- `failed`

Payment stages:

- `pending_initial`
- `half_paid`
- `paid_full`
- `stopped_midway`
- `completed`

### New Order

When checkout intent converts:

- Order is created as `new`.
- Paid plan payment status is `pending`.
- Free sample payment status is `paid`.
- Paid plan payment stage is `pending_initial`.
- Free sample payment stage is `paid_full`.

### Chef Confirmation

Chef confirms an order from the dashboard.

For paid plans, chef must enter:

- Order ID
- User ID
- Transaction ID

The API validates these before activation.

On confirm:

- Status becomes `confirmed`.
- Payment status becomes:
  - `pending` for half-payment plans.
  - `paid` for full payment.
- Payment stage becomes:
  - `half_paid`
  - `paid_full`
- Plan activation date is set.
- Plan expiry date is calculated by service days.
- Remaining payment due date is calculated by service days for half-payment plans.
- WhatsApp activation message is sent.

### Service-Day Plan Duration

File: `lib/plan-duration.ts`

Monthly plan:

- 30 calendar day label.
- 26 service days.

Weekly plan:

- 6 service days.

Sundays are skipped for service-day calculations.

`addServiceDaysToIsoStartDate` returns an ISO date string in Asia/Kolkata at midnight after counting only non-Sunday delivery days.

### Half Payment

Half-payment plans:

- Only monthly plans can use half payment.
- Initial payment amount is due first.
- Remaining amount is tracked.
- Remaining payment due date is shown to customer and chef.
- Chef can send reminder.
- Chef can confirm remaining payment.
- Chef can close the plan midway after first half.

### Cancellation

Chef can cancel:

- Pending orders.
- Active paid plans, but active plan cancellation requires typing `confirm`.

Cancellation records:

- Status `cancelled`.
- Payment status depends on whether it was active paid plan.
- Cancellation reason.
- WhatsApp cancellation message.

### Stop Midway

For half-payment monthly plans:

- Chef can mark the plan completed/stopped midway.
- Payment stage becomes `stopped_midway`.
- Completion reason is saved.
- WhatsApp message is sent.

## 15. My Plan Page

Files:

- `app/my-plan/page.tsx`
- `app/my-plan/MyPlanClient.tsx`
- `app/api/my-plan/route.ts`

### API

`GET /api/my-plan`:

- Requires customer auth.
- Fetches orders for the logged-in user.
- Returns them sorted newest first.

### UI Sections

The page groups orders into:

- Pending chef confirmation.
- Free sample delivery.
- Half payment confirmed.
- Active orders.
- Plan history.

Active plan cards show:

- Plan name.
- Type.
- Status.
- Requested start.
- Actual start.
- Expiry.
- Service days left.
- Half payment due info.
- Transaction reference.

Service days left is calculated with `getOrderServiceDaysRemaining`.

## 16. Meal Pause System

Files:

- `app/profile/ProfilePageClient.tsx`
- `app/api/plan-pauses/route.ts`
- `lib/plan-pauses.ts`
- `supabase/schema.sql`

### Business Rule

Active week and month plan users can pause meals:

- Weekly plan: 1 pause request.
- Monthly plan: 3 pause requests.
- Pause start must be from day after tomorrow.
- Sundays are disabled.
- Dates must be within active plan window.
- Half-paid users can pause only inside the already-paid half window.
- Pause is automatically approved.
- Skipped service days are added to the end of the plan.
- Remaining payment due date extends when half-paid applicable dates are skipped.

### API GET

`GET /api/plan-pauses` returns:

- Eligible active orders.
- Existing pause requests.
- Minimum start date.
- Selectable pause dates for each order.

### API POST

`POST /api/plan-pauses`:

1. Authenticates user.
2. Loads user's paid plan orders and pauses.
3. Confirms order belongs to user.
4. Validates eligibility.
5. Validates date range.
6. Removes Sundays from skipped dates.
7. Checks pause request limit.
8. Checks overlap with existing pauses.
9. Inserts approved pause request.
10. Updates order `plan_expires_at`.
11. Updates `remaining_payment_due_at` for eligible half-paid plans.
12. Rolls back pause status to cancelled if order update fails.

### Profile UI

Profile page shows:

- Active eligible plan selector.
- Calendar of selectable dates.
- Disabled Sundays and unavailable dates.
- Selected date range.
- Selected service-day count.
- Pause history.
- Automatic success message after confirmation.

## 17. Chef Portal

Files:

- `app/chef/page.tsx`
- `app/chef/signup/page.tsx`
- `app/chef/dashboard/page.tsx`
- `app/api/admin/**`
- `lib/admin-auth.ts`

### Chef Auth

Chef users are authenticated through Supabase like customers, but authorization is based on `ADMIN_EMAILS`.

`requireAdminUser`:

1. Reads bearer token.
2. Fetches Supabase auth user.
3. Reads `ADMIN_EMAILS`.
4. Allows only matching admin email.

Chef session uses:

- `projectfit.chef.session`

Customer session and chef session are separate.

### Chef Login

`/chef`:

- Login form.
- On login, saves chef session.
- Calls `/api/admin/me`.
- Redirects to `/chef/dashboard` if authorized.

### Chef Signup

`/chef/signup`:

- Allows account creation only for emails in `ADMIN_EMAILS`.
- Creates Supabase auth user.
- Upserts app user row.

### Dashboard Data

`GET /api/admin/overview` loads:

- App users.
- Supabase auth users.
- Profiles.
- Orders.
- Menu items.
- Meal plans.
- Customer feedback.
- WhatsApp logs.
- Plan pause requests.
- Program plan overrides.

It merges auth users and app users so verified auth users appear even if an app users row is missing.

### Dashboard Tabs

Chef dashboard tabs:

- Pending orders.
- Sample requests.
- Approved samples.
- Sample status.
- WhatsApp chats.
- Delivery calendar.
- Half payments.
- Active plans.
- Completed orders.
- Plan history.
- Users.
- Feedback.
- Menus.
- Pricing.

### Pending Orders

Shows paid plan orders that are waiting for chef confirmation.

Chef actions:

- Confirm order with order ID, user ID, transaction ID.
- Cancel order.

### Free Samples

Chef can:

- Approve free sample request.
- Send WhatsApp buttons for delivery confirmation.
- Cancel sample.
- Reset sample limit for user.

### Delivery Calendar

The delivery calendar:

- Shows next 30 days.
- Skips Sundays.
- Checks active plans by date.
- Excludes skipped pause dates.
- Groups orders by:
  - Day plan.
  - Week plan.
  - Month plan.

This gives chef a daily operations view of who needs meals.

### Half Payments

Chef can:

- View half-paid plans.
- Send remaining payment reminder template.
- Confirm remaining payment.
- Move plan to completed/stopped-midway.

### WhatsApp Chats

Chef can:

- See incoming/outgoing WhatsApp logs.
- View media previews.
- Reply within WhatsApp 24-hour customer service window.
- Mark messages read.

The UI derives phone variants so messages are grouped even if phone number formats differ.

### Menu Management

Chef can:

- Add menu items.
- Edit menu items.
- Delete menu items.
- Upload menu item images as data URLs.
- Mark items active/inactive.
- Mark items as free sample.
- Assign program slug.

### Pricing Management

Chef can update program plan overrides:

- Plan name.
- Duration.
- Price.
- Highlight.
- Active state.

These overrides affect program pages and server-side trusted checkout pricing.

## 18. Menu Page

Files:

- `app/menu/page.tsx`
- `app/api/menu-items/route.ts`
- `components/FoodCard.tsx`

### API

`GET /api/menu-items`:

- Fetches active, non-free-sample menu items.
- Orders by program slug, category, and name.

### UI

Menu page:

- Loads user profile for personalized recommendation.
- Loads menu items.
- Maps DB menu item to display card.
- Supports filters:
  - Category.
  - Veg only.
  - Non-veg only.
  - High protein.
- Displays empty/loading/error states.

Food card shows:

- Image.
- Name.
- Description.
- Calories.
- Protein.
- Veg/non-veg marker.
- Ingredients preview.

Current menu macros use available DB protein value and fallback zeroes for calories/carbs.

## 19. Feedback System

Files:

- `app/profile/ProfilePageClient.tsx`
- `app/api/feedback/route.ts`
- `app/chef/dashboard/page.tsx`

Customer profile page includes feedback form.

Feedback rules:

- Requires auth.
- Message must be 5 to 1200 characters.
- Stored in `customer_feedback`.
- Customer can view previous feedback.
- Chef dashboard displays feedback with customer name/email.

## 20. Notification System

File: `components/NotificationsButton.tsx`

The floating notification button:

- Fetches `/api/my-plan`.
- Looks for half-paid orders with remaining amount.
- Shows count badge.
- Opens panel with due payment reminder text.
- Refreshes every 60 seconds.

It is rendered only when notifications exist.

## 21. WhatsApp Integration

Files:

- `lib/whatsapp.ts`
- `app/api/webhooks/whatsapp/route.ts`
- `app/api/admin/whatsapp/**`
- `app/api/whatsapp/welcome/route.ts`
- `docs/WHATSAPP_INTEGRATION.md`

### Environment Variables

WhatsApp uses:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_PHONE_NUMBER`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_GRAPH_API_VERSION`
- `WHATSAPP_PAYMENT_QR_MEDIA_ID`
- `PROJECTFIT_INTERNAL_API_SECRET`

### Signature Verification

`verifyMetaSignature` uses:

- `x-hub-signature-256`
- HMAC SHA-256
- Timing-safe comparison

This protects webhook endpoint from forged requests.

### Message Logging

All WhatsApp messages are logged to `whatsapp_message_logs` with:

- User ID.
- Phone.
- Direction.
- Message type.
- Template name.
- Body.
- Status.
- Provider message ID.
- Error message.
- Raw payload.

### Outgoing Messages

The app can send:

- Welcome template.
- Plain text.
- Images.
- Free sample approval buttons.
- Plan payment instructions.
- Plan activation message.
- Remaining payment reminder template.
- Remaining payment confirmed message.
- Plan stopped midway message.
- Cancellation message.
- Admin chat replies.
- Read receipts.

### Payment QR

Payment QR image is sent through WhatsApp:

- Uses `WHATSAPP_PAYMENT_QR_MEDIA_ID` if configured.
- Otherwise uploads `public/payment-qr-scanner.jpeg` to WhatsApp media API.

## 22. Supabase Backend Layer

File: `lib/supabase-rest.ts`

This module centralizes Supabase calls.

### Environment Handling

Supported URL vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_URL`

Supported public key vars:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`

Supported server key vars:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`

### Functions

- `getSupabaseUrl`
- `getPublicKey`
- `hasSupabaseConfig`
- `canUseMockAuth`
- `supabaseAuthFetch`
- `supabaseAuthAdminFetch`
- `supabaseRestFetch`
- `getUserFromAccessToken`

### Important Security Note

Most API routes validate the user token, then use server-side Supabase service credentials for database access. This bypasses RLS at the request level, so route code must enforce ownership and admin checks carefully.

Current route ownership checks are implemented in:

- Profile routes.
- Feedback routes.
- My Plan routes.
- Checkout routes.
- Plan pause routes.
- Admin routes through `requireAdminUser`.

## 23. Database Design

File: `supabase/schema.sql`

### `users`

Stores app-level user details:

- Auth user ID.
- Name.
- Email.
- Phone.
- WhatsApp opt-in status.
- Created date.

### `customer_profiles`

Stores customer profile and personalization data:

- Health and body details.
- Diet goals.
- Medical report file data.
- Saved delivery address.
- Recommendation fields.
- Profile completion status.

### `orders`

Stores all paid plan and free sample orders:

- Items.
- Price fields.
- Order type.
- Status.
- Payment status.
- Payment stage.
- Initial and remaining payment amounts.
- Plan activation/expiry.
- Delivery address.
- WhatsApp checkout intent link.
- Customer delivery confirmation fields.

### `menu_items`

Chef-managed menu data:

- Name.
- Description.
- Price.
- Category.
- Program slug.
- Photo URL.
- Servings.
- Protein grams.
- Ingredients.
- Free sample flag.
- Active flag.

### `meal_plans`

General meal plan table used by WhatsApp replies/admin plan management.

### `whatsapp_message_logs`

Stores inbound/outbound WhatsApp logs.

### `customer_feedback`

Stores customer feedback.

### `free_sample_device_claims`

Prevents repeated free sample requests.

There are unique partial indexes for active:

- Device ID.
- User ID.

This reduces race-condition duplicate claims.

### `checkout_intents`

Temporary checkout state that bridges website checkout to WhatsApp order creation.

### `program_plan_overrides`

Admin-managed overrides for static plan definitions.

### `plan_pause_requests`

Tracks meal pause history and extension calculations.

### Triggers

`set_updated_at` updates `updated_at` for key tables on update.

### RLS

RLS is enabled on all public tables. Policies allow users to read/update their own user/profile/order/pause data where appropriate. Server routes use service role credentials, so route-level checks remain important.

## 24. API Route Map

### Auth

- `POST /api/auth/signup`: create customer account and profile.
- `POST /api/auth/login`: password login.
- `POST /api/auth/session`: refresh session.
- `GET /api/auth/google`: start Google OAuth.
- `GET /api/auth/oauth-session`: finish OAuth session handoff.
- `POST /api/auth/chef-signup`: create allow-listed chef account.

### Customer

- `GET /api/profile`: load profile.
- `POST /api/profile`: save profile.
- `GET /api/menu-items`: public active menu.
- `POST /api/checkout-intents`: create WhatsApp checkout.
- `GET /api/my-plan`: user order history.
- `GET /api/feedback`: user feedback history.
- `POST /api/feedback`: submit feedback.
- `GET /api/plan-pauses`: load eligible pause data.
- `POST /api/plan-pauses`: create meal pause.
- `GET /api/public-config`: expose safe public config.

### Orders

- `GET /api/orders`: admin order list.
- `POST /api/orders`: legacy direct order creation.
- `PATCH /api/orders/[id]/status`: admin order status/actions.

### Admin

- `GET /api/admin/me`: check admin session.
- `GET /api/admin/overview`: chef dashboard data.
- `POST/PATCH/DELETE /api/admin/menu-items`: menu item management.
- `POST/PATCH /api/admin/meal-plans`: meal plan management.
- `PATCH /api/admin/program-plans`: program pricing overrides.
- `POST /api/admin/free-sample-reset`: reset sample limit.
- `POST /api/admin/whatsapp/reply`: send WhatsApp reply.
- `POST /api/admin/whatsapp/read`: mark WhatsApp messages read.
- `GET /api/admin/whatsapp/media/[mediaId]`: proxy WhatsApp media.

### WhatsApp

- `GET /api/webhooks/whatsapp`: Meta webhook verification.
- `POST /api/webhooks/whatsapp`: incoming message/status processing.
- `POST /api/whatsapp/welcome`: internal welcome template trigger.

## 25. Data And Business Rules

### Single Item Checkout

Only one plan or one sample can be checked out at a time. This simplifies payment, kitchen operations, and plan lifecycle management.

### Free Samples

Rules:

- One active free sample per account.
- One active free sample per device.
- Free sample requests require a generated browser device ID.
- Chef approval is required.
- Customer can confirm received/not received through WhatsApp buttons.

### Duplicate Paid Orders

A customer cannot order the same program again while:

- There is a pending order for the same program.
- There is an active plan for the same program.

### Delivery

- Sundays are off.
- Delivery calendar excludes Sundays.
- Service-day calculations skip Sundays.
- Some pincodes are included delivery areas.
- Other serviceable areas may require parcel fare.

### Meal Pauses

- Start from day after tomorrow.
- Sundays unavailable.
- Weekly: 1 request.
- Monthly: 3 requests.
- Auto-approved.
- Extends plan end.
- Half-paid users limited to paid half.

## 26. Security And Validation

### Good Security Practices Present

- Supabase auth token validation before customer actions.
- Admin email allow-list for chef routes.
- Route-level ownership checks.
- WhatsApp webhook signature verification.
- Rate limiting for signup and WhatsApp webhook.
- Server-side checkout price recalculation.
- Duplicate order checks.
- Unique active free-sample DB indexes.
- Phone and pincode validation.
- Google OAuth PKCE flow.
- Sensitive OAuth session handoff through HTTP-only cookies.

### Areas To Keep Improving

- Add a real forgot-password flow.
- Add full legal copy for Terms and Privacy.
- Consider moving from localStorage sessions to HTTP-only session cookies for stronger XSS resilience.
- Add automated tests for checkout, pause, and order lifecycle logic.
- Add DB constraints for positive totals and payment amounts.
- Consider audit logs for admin actions.

## 27. Deployment And Environment

Expected deployment platform:

- Vercel or compatible Next.js hosting.

Important environment variables:

- Supabase URL and keys.
- Admin email list.
- Google Maps API key.
- Serviceable pincodes.
- WhatsApp credentials.
- Internal API secret.
- Payment QR media ID.

`.env.example` documents required variables.

## 28. Current Known Product Limitations

These are not necessarily bugs, but important current-state notes:

- Custom monthly plan `customPrices` are static in `data/diets.ts`. Admin price override changes base plan price, not per-meal custom price map.
- Plans showing "Updating soon" can still be added to cart if their price is zero, because this behavior was intentionally left unchanged per request.
- Legal pages are basic placeholders and should be replaced with final business-approved legal text.
- Menu item calories/carbs/fat are not fully data-backed yet; protein is supported.
- Forgot password is not implemented as a reset-email flow yet.
- WhatsApp manual payment workflow depends on staff verifying screenshots and transaction IDs.

## 29. End-To-End User Journey

### New Customer

1. Opens home page.
2. Reviews hero, plan options, features, and how-it-works sections.
3. Clicks a program card.
4. If not logged in, goes to signup.
5. Creates account with profile details and WhatsApp consent.
6. Confirms email if Supabase requires confirmation.
7. Opens selected program.
8. Reviews program nutrition profile and plan options.
9. Adds plan or sample to cart.
10. Enters delivery address and phone.
11. Selects start date.
12. Selects full or half payment if monthly.
13. Clicks Place Order.
14. Website creates checkout intent.
15. WhatsApp opens with prefilled checkout message.
16. User sends message.
17. Webhook creates order.
18. User receives payment instructions.
19. Chef verifies payment and activates plan.
20. User tracks status in My Plan.

### Active Plan Customer

1. Opens Profile.
2. Goes to Pause Meals section.
3. Chooses active week/month plan.
4. Selects allowed non-Sunday range.
5. Confirms pause.
6. Backend auto-approves.
7. Selected dates are skipped.
8. Plan end date is extended.

### Chef/Admin

1. Opens `/chef`.
2. Logs in with admin allow-listed email.
3. Enters dashboard.
4. Reviews pending orders.
5. Confirms payments.
6. Sends WhatsApp updates.
7. Uses delivery calendar for daily operations.
8. Manages menus, samples, pricing, users, feedback, and WhatsApp conversations.

## 30. How The Code Is Written

### Component Pattern

The code uses small to medium React components:

- Page files assemble page-level structure.
- Feature components own UI logic.
- CSS Modules colocate styles with components.
- Shared utility logic lives in `lib`.

### API Pattern

API route handlers follow this shape:

1. Parse request.
2. Authenticate user or admin.
3. Validate inputs.
4. Load relevant Supabase data.
5. Apply business rules.
6. Write database changes.
7. Return JSON.

### State Pattern

Local state is split between:

- React `useState` for form/UI state.
- Zustand for global cart/modal state.
- localStorage for auth sessions and profile prefill.
- Supabase for durable server state.

### Styling Pattern

Styling is:

- Global design tokens in `globals.css`.
- CSS Modules for page/component layouts.
- Inline CSS variables for program accent colors.
- Lucide icons for UI actions.
- Motion props for scroll and entry animations.

### Data Flow Pattern

Static data and DB data are combined:

- Static program catalog gives the product shape.
- Supabase overrides modify prices, names, highlights, and menu items.
- Backend recalculates trusted checkout from the combined catalog.

## 31. Operational Checklist

Before production use:

1. Confirm Supabase migrations are applied.
2. Confirm `ADMIN_EMAILS` is set.
3. Confirm WhatsApp webhook verify token and app secret are set.
4. Confirm WhatsApp templates are approved.
5. Confirm payment QR media ID or local QR image exists.
6. Confirm Google Maps API key is restricted and active.
7. Confirm serviceable pincodes are accurate.
8. Confirm program prices and active state in chef pricing tab.
9. Confirm free sample menu items are added.
10. Run `npm run lint`.
11. Run `npm run build`.

## 32. Conclusion

Project Fit is a full-stack subscription and kitchen-operations platform, not just a landing page. The customer-facing side focuses on trust, program discovery, signup, profile personalization, delivery address capture, and WhatsApp checkout. The backend handles authentication, profile storage, trusted pricing, checkout intent creation, order creation, plan lifecycle, pauses, feedback, and WhatsApp automation. The chef portal completes the operational loop by giving staff the tools to approve orders, manage menus and pricing, handle payments, communicate on WhatsApp, and plan daily deliveries.

The architecture is pragmatic for a growing local food subscription business: static catalog for predictable program structure, Supabase for fast backend development, WhatsApp for real-world payment/support flow, and chef dashboard tooling for day-to-day operations.
