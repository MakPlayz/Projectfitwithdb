import type { ApiOrder, CheckoutIntent, CustomerProfile, DeliveryAddress, FreeSampleDeviceClaim } from '@/lib/backend-types';
import { isIncludedDeliveryPincode } from '@/lib/serviceable-pincodes';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { CartItem } from '@/store/cartStore';

const intentCodePattern = /\bPFI-[A-Z0-9]{6}\b/i;

function createCheckoutCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PFI-';

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function normalizeCheckoutPhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return digits;
}

function phoneMatchesCheckoutSender(whatsappFrom: string, intent: CheckoutIntent) {
  const sender = normalizeCheckoutPhone(whatsappFrom);
  if (!sender) return false;

  const allowedPhones = [
    intent.phone,
    intent.delivery_address.phone,
  ]
    .map(normalizeCheckoutPhone)
    .filter((phone): phone is string => Boolean(phone));

  return allowedPhones.includes(sender);
}

export function findCheckoutCode(message: string) {
  return message.match(intentCodePattern)?.[0]?.toUpperCase() ?? null;
}

export function isFreeSampleCart(items: CartItem[]) {
  return items.length === 1 && items[0].itemType === 'free_sample' && items[0].quantity === 1;
}

export function inferProgramKey(items: CartItem[]) {
  if (items[0]?.programSlug) return items[0].programSlug;

  const text = items.map((item) => `${item.id} ${item.name}`).join(' ').toLowerCase();
  const prefix = items[0]?.id?.slice(0, 2).toLowerCase();
  const prefixMap: Record<string, string> = {
    wl: 'weight-loss',
    mg: 'mass-gain',
    pr: 'pregnancy',
    pc: 'pcos-pcod',
    db: 'diabetes',
    kd: 'kids',
  };

  if (prefix && prefixMap[prefix]) return prefixMap[prefix];
  if (text.includes('weight')) return 'weight-loss';
  if (text.includes('mass')) return 'mass-gain';
  if (text.includes('preg')) return 'pregnancy';
  if (text.includes('pcos') || text.includes('pcod')) return 'pcos-pcod';
  if (text.includes('diabetes')) return 'diabetes';
  if (text.includes('kids')) return 'kids';
  return items[0]?.id ?? 'meal-plan';
}

export function isBlockingOrder(order: ApiOrder) {
  if (order.status === 'cancelled' || order.payment_status === 'failed') return false;
  if (order.status === 'new') return true;
  if (!order.plan_expires_at) return ['confirmed', 'preparing', 'ready'].includes(order.status);
  return new Date(order.plan_expires_at) >= new Date();
}

export function buildCheckoutWhatsAppMessage(intent: CheckoutIntent) {
  const itemList = intent.items.map((item) => `${item.quantity}x ${item.name}`).join('\n');
  const deliveryNote = isIncludedDeliveryPincode(intent.delivery_address.pincode)
    ? 'Delivery included in selected plan area'
    : 'Rapido parcel fare applies separately';

  if (intent.order_type === 'free_sample') {
    return [
      'Hi Project Fit, I want to confirm my free sample request.',
      '(Please don\'t change or edit this message before sending.)',
      '',
      `User ID: ${intent.user_id}`,
      `Checkout code: ${intent.code}`,
      `Name: ${intent.customer_name ?? 'Project Fit customer'}`,
      `Phone: ${intent.delivery_address.phone}`,
      `Pincode: ${intent.delivery_address.pincode}`,
      '',
      'Sample:',
      itemList,
      '',
      'Please create my free sample request for chef approval.',
    ].join('\n');
  }

  return [
    'Hi Project Fit, I want to confirm my meal plan order.',
    '(Please don\'t change or edit this message before sending.)',
    '',
    `User ID: ${intent.user_id}`,
    `Checkout code: ${intent.code}`,
    `Name: ${intent.customer_name ?? 'Project Fit customer'}`,
    `Phone: ${intent.delivery_address.phone}`,
    `Pincode: ${intent.delivery_address.pincode}`,
    `Plan amount: Rs ${intent.total.toLocaleString('en-IN')}`,
    `Payment option: ${intent.payment_option === 'half' ? 'Half payment now, remaining payment later' : 'Full payment now'}`,
    `Amount due now: Rs ${intent.payable_now.toLocaleString('en-IN')}`,
    ...(intent.remaining_amount > 0 ? [`Remaining amount after plan starts: Rs ${intent.remaining_amount.toLocaleString('en-IN')}`] : []),
    `Requested start date: ${intent.requested_start_date ?? 'Not selected'}`,
    `Delivery: ${deliveryNote}`,
    '',
    'Plan/items:',
    itemList,
    '',
    'Please send the QR payment scanner for the amount due now. I will share the payment screenshot after payment.',
  ].join('\n');
}

export async function createCheckoutIntent(payload: Omit<CheckoutIntent, 'id' | 'code' | 'status' | 'order_id' | 'whatsapp_from' | 'whatsapp_message_id' | 'expires_at' | 'created_at' | 'updated_at'>) {
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = createCheckoutCode();
    const result = await supabaseRestFetch<CheckoutIntent[]>('/checkout_intents', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        code,
        status: 'pending',
      }),
    });

    if (!result.error) {
      return { intent: result.data?.[0] ?? null, error: null, status: result.status };
    }

    lastError = result.error;
    if (!/duplicate|unique/i.test(result.error)) {
      return { intent: null, error: result.error, status: result.status };
    }
  }

  return { intent: null, error: lastError ?? 'Could not create checkout code.', status: 500 };
}

export async function convertCheckoutIntentFromWhatsApp({
  code,
  whatsappFrom,
  whatsappMessageId,
}: {
  code: string;
  whatsappFrom: string;
  whatsappMessageId?: string | null;
}) {
  const intentResult = await supabaseRestFetch<CheckoutIntent[]>(
    `/checkout_intents?code=eq.${encodeURIComponent(code)}&select=*&limit=1`
  );

  if (intentResult.error) {
    throw new Error(intentResult.error);
  }

  const intent = intentResult.data?.[0] ?? null;
  if (!intent) {
    return { order: null, message: `We could not find checkout code ${code}. Please start checkout again from the website.` };
  }

  if (intent.status === 'converted' && intent.order_id) {
    return { order: null, message: `This checkout is already confirmed. Your order ID is ${intent.order_id}.` };
  }

  if (intent.status !== 'pending') {
    return { order: null, message: `Checkout code ${code} is no longer active. Please start checkout again from the website.` };
  }

  if (new Date(intent.expires_at).getTime() < Date.now()) {
    await supabaseRestFetch<CheckoutIntent[]>(`/checkout_intents?id=eq.${encodeURIComponent(intent.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'expired' }),
    });
    return { order: null, message: `Checkout code ${code} has expired. Please start checkout again from the website.` };
  }

  if (!phoneMatchesCheckoutSender(whatsappFrom, intent)) {
    return {
      order: null,
      message: 'This checkout code is linked to a different phone number. Please open checkout from your own account and send the WhatsApp message again.',
    };
  }

  if (intent.order_type === 'free_sample') {
    const [deviceClaimResult, userClaimResult, existingOrdersResult] = await Promise.all([
      intent.free_sample_device_id
        ? supabaseRestFetch<FreeSampleDeviceClaim[]>(
            `/free_sample_device_claims?active=eq.true&device_id=eq.${encodeURIComponent(intent.free_sample_device_id)}&select=*&limit=1`
          )
        : Promise.resolve({ data: [], error: null, status: 200 }),
      supabaseRestFetch<FreeSampleDeviceClaim[]>(
        `/free_sample_device_claims?active=eq.true&user_id=eq.${intent.user_id}&select=*&limit=1`
      ),
      supabaseRestFetch<ApiOrder[]>(
        `/orders?user_id=eq.${intent.user_id}&order_type=eq.free_sample&status=neq.cancelled&select=*&limit=1`
      ),
    ]);

    const duplicateClaim = deviceClaimResult.data?.[0] || userClaimResult.data?.[0] || existingOrdersResult.data?.[0];
    if (deviceClaimResult.error || userClaimResult.error || existingOrdersResult.error) {
      throw new Error(deviceClaimResult.error ?? userClaimResult.error ?? existingOrdersResult.error ?? 'Could not check free sample limit.');
    }

    if (duplicateClaim) {
      return {
        order: null,
        message: 'A free sample is already linked to this account or device. Ask the chef to reset the limit if needed.',
      };
    }
  } else {
    const existingOrdersResult = await supabaseRestFetch<ApiOrder[]>(
      `/orders?user_id=eq.${intent.user_id}&select=*`
    );

    if (existingOrdersResult.error) {
      throw new Error(existingOrdersResult.error);
    }

    const programKey = inferProgramKey(intent.items);
    const duplicateOrder = (existingOrdersResult.data ?? []).find(
      (order) => isBlockingOrder(order) && inferProgramKey(order.items) === programKey
    );

    if (duplicateOrder) {
      return {
        order: null,
        message:
          duplicateOrder.status === 'new'
            ? `You already have a pending order for this program: ${duplicateOrder.id}.`
            : 'You already have an active order for this program. You can order it again after the current plan expires.',
      };
    }
  }

  const orderResult = await supabaseRestFetch<ApiOrder[]>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      user_id: intent.user_id,
      customer_name: intent.customer_name,
      items: intent.items,
      subtotal: intent.subtotal,
      tax: intent.tax,
      total: intent.total,
      payment_option: intent.payment_option,
      payment_stage: intent.order_type === 'free_sample' ? 'paid_full' : 'pending_initial',
      initial_payment_amount: intent.payable_now,
      remaining_payment_amount: intent.remaining_amount,
      order_type: intent.order_type,
      status: 'new',
      payment_status: intent.order_type === 'free_sample' ? 'paid' : 'pending',
      delivery_address: intent.delivery_address,
      requested_start_date: intent.requested_start_date,
      cancellation_reason: null,
      whatsapp_checkout_intent_id: intent.id,
      customer_delivery_status: 'pending',
    }),
  });

  if (orderResult.error) {
    throw new Error(orderResult.error);
  }

  const order = orderResult.data?.[0] ?? null;
  if (!order) {
    throw new Error('Could not create order from WhatsApp checkout.');
  }

  if (intent.order_type === 'free_sample' && intent.free_sample_device_id) {
    const claimResult = await supabaseRestFetch<FreeSampleDeviceClaim[]>('/free_sample_device_claims', {
      method: 'POST',
      body: JSON.stringify({
        user_id: intent.user_id,
        device_id: intent.free_sample_device_id,
        order_id: order.id,
        active: true,
      }),
    });

    if (claimResult.error) {
      await supabaseRestFetch<ApiOrder[]>(`/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          payment_status: 'failed',
          cancellation_reason: 'Free sample device claim could not be created.',
        }),
      });
      throw new Error(claimResult.error);
    }
  }

  await supabaseRestFetch<CheckoutIntent[]>(`/checkout_intents?id=eq.${encodeURIComponent(intent.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'converted',
      order_id: order.id,
      whatsapp_from: whatsappFrom,
      whatsapp_message_id: whatsappMessageId ?? null,
    }),
  });

  return {
    order,
    message:
      intent.order_type === 'free_sample'
        ? `Your free sample request has been created. Order ID: ${order.id}. It is waiting for chef approval.`
        : `Your meal plan order has been created. Order ID: ${order.id}. The chef team will verify payment details on WhatsApp.`,
  };
}

export async function markFreeSampleDeliveryStatus({
  orderId,
  status,
  payload,
}: {
  orderId: string;
  status: 'received' | 'not_received';
  payload: unknown;
}) {
  const result = await supabaseRestFetch<ApiOrder[]>(`/orders?id=eq.${encodeURIComponent(orderId)}&order_type=eq.free_sample`, {
    method: 'PATCH',
    body: JSON.stringify({
      customer_delivery_status: status,
      customer_delivery_confirmed_at: new Date().toISOString(),
      customer_delivery_response_payload: payload,
    }),
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data?.[0] ?? null;
}

export function buildCustomerName(profile: CustomerProfile | null, userName: string | null | undefined, userEmail: string | null | undefined) {
  return profile?.full_name || userName || userEmail || 'Project Fit customer';
}

export function normalizeDeliveryAddressForStorage(deliveryAddress: DeliveryAddress) {
  return {
    ...deliveryAddress,
    addressLine1: deliveryAddress.addressLine1.trim(),
    addressLine2: deliveryAddress.addressLine2?.trim() || undefined,
    city: deliveryAddress.city.trim(),
    pincode: deliveryAddress.pincode.trim(),
    phone: deliveryAddress.phone.trim(),
  };
}
