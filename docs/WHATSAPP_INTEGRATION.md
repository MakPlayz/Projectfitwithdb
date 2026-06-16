# WhatsApp Integration

Project Fit Vizag uses WhatsApp Cloud API for signup welcome templates, incoming customer replies, delivery/status logs, and admin smoke tests.

## Environment Variables

Set these in Vercel for Production and Preview if preview webhooks are tested:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_PHONE_NUMBER
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_SECRET
WHATSAPP_GRAPH_API_VERSION
WHATSAPP_KITCHEN_CONTACT_MESSAGE
PROJECTFIT_INTERNAL_API_SECRET
WHATSAPP_ADMIN_TOKEN
```

`WHATSAPP_GRAPH_API_VERSION` defaults to `v21.0` if omitted.
`WHATSAPP_BUSINESS_PHONE_NUMBER` is optional; checkout links resolve the phone number from `WHATSAPP_PHONE_NUMBER_ID` when it is not set. If you set it, it must be the Meta WhatsApp Business number that owns the webhook, not a personal kitchen number.

## Meta Dashboard Setup

1. Create and approve the `welcome_projectfit` template.
2. Set the webhook callback URL:

```text
https://projectfitvizag.com/api/webhooks/whatsapp
```

3. Use `WHATSAPP_VERIFY_TOKEN` as the Meta webhook verify token.
4. Subscribe to WhatsApp `messages` and message status events.
5. Confirm the app secret in Meta matches `WHATSAPP_APP_SECRET`.

## App Behavior

- Signup calls `/api/whatsapp/welcome` for opted-in users.
- `/api/webhooks/whatsapp` verifies Meta signatures, logs incoming messages, updates delivery statuses, and replies to menu commands.
- Cart checkout creates a `checkout_intents` row first and opens WhatsApp with a checkout code.
- Checkout links must point to the Meta WhatsApp Business number, because only that number sends webhooks to the app.
- The real `orders` row is created only after the customer sends the WhatsApp checkout message.
- Free sample approval sends a WhatsApp button message with `Received` and `Not received` actions.
- Customers can reply with `1`, `2`, `3`, `4`, or words like `menu`, `specials`, `plans`, and `contact`.
- `/admin/whatsapp?token=WHATSAPP_ADMIN_TOKEN` shows opt-ins, logs, failed deliveries, menu/plans, and a send-test form.

## Database Migration

Apply this migration before deploying the WhatsApp-confirmed checkout flow:

```text
supabase/migrations/20260617000100_whatsapp_checkout_intents.sql
```

It adds:

- `public.checkout_intents`
- `orders.whatsapp_checkout_intent_id`
- `orders.customer_delivery_status`
- `orders.customer_delivery_confirmed_at`
- `orders.customer_delivery_response_payload`

## Smoke Tests

1. Open `/admin/whatsapp?token=...`.
2. Add a free sample to cart and click order.
3. Send the prefilled WhatsApp message with the checkout code.
4. Confirm the free sample appears in Chef Dashboard -> Sample requests.
5. Approve the free sample and confirm the customer receives `Received` / `Not received` buttons.
6. Tap a button from the customer phone and confirm Chef Dashboard -> Approved samples updates delivery status.
7. From the test WhatsApp account, reply `menu`, `plans`, and `contact`.
8. Confirm incoming and outgoing logs appear in Message Logs.
9. In Meta webhook logs, confirm callbacks return HTTP 200.

Custom text sends only work inside Meta's customer-service window unless Meta policy allows the conversation. Use the approved template for out-of-window tests.
