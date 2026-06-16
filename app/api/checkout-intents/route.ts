import { NextResponse } from 'next/server';
import type { CartItem } from '@/store/cartStore';
import type { ApiOrder, CustomerProfile, DeliveryAddress, FreeSampleDeviceClaim } from '@/lib/backend-types';
import {
  buildCheckoutWhatsAppMessage,
  buildCustomerName,
  createCheckoutIntent,
  inferProgramKey,
  isBlockingOrder,
  isFreeSampleCart,
  normalizeDeliveryAddressForStorage,
} from '@/lib/checkout-intents';
import { validateAddressPincodeMatch } from '@/lib/delivery-address-validation';
import { isDeliverablePincode } from '@/lib/serviceable-pincodes';
import { getUserFromAccessToken, supabaseRestFetch } from '@/lib/supabase-rest';

interface CreateIntentBody {
  items?: CartItem[];
  subtotal?: number;
  deliveryAddress?: Partial<DeliveryAddress>;
  requestedStartDate?: string;
  freeSampleDeviceId?: string;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getManualPaymentWhatsAppNumber() {
  const raw = process.env.MY_NUMBER?.trim() ?? '';
  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  return digits.startsWith('91') ? digits : `91${digits}`;
}

function validateDeliveryAddress(value: Partial<DeliveryAddress> | undefined) {
  const deliveryAddress: DeliveryAddress = {
    addressLine1: normalizeText(value?.addressLine1),
    addressLine2: normalizeText(value?.addressLine2) || undefined,
    city: normalizeText(value?.city),
    pincode: normalizeText(value?.pincode),
    phone: normalizeText(value?.phone),
  };

  if (typeof value?.latitude === 'number' && typeof value.longitude === 'number') {
    deliveryAddress.latitude = value.latitude;
    deliveryAddress.longitude = value.longitude;
  }

  if (
    !deliveryAddress.addressLine1 ||
    !deliveryAddress.city ||
    !/^[1-9][0-9]{5}$/.test(deliveryAddress.pincode) ||
    !/^[6-9][0-9]{9}$/.test(deliveryAddress.phone)
  ) {
    return {
      deliveryAddress: null,
      error: 'Enter a complete delivery address, 6-digit pincode, and 10-digit phone number.',
    };
  }

  if (!isDeliverablePincode(deliveryAddress.pincode)) {
    return {
      deliveryAddress: null,
      error: 'Your area is outside our current deliverable areas. Please enter a supported delivery pincode.',
    };
  }

  return { deliveryAddress: normalizeDeliveryAddressForStorage(deliveryAddress), error: null };
}

function formatDateInputValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateValueInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function addDaysToDateValue(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateInputValue(date);
}

function getMinimumStartDateValue() {
  return addDaysToDateValue(getDateValueInTimeZone(new Date(), 'Asia/Kolkata'), 1);
}

function normalizeStartDate(value: unknown) {
  const raw = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { date: null, error: 'Select when you want your meal plan to start.' };
  }

  const [year, month, day] = raw.split('-').map(Number);
  const selected = new Date(Date.UTC(year, month - 1, day));
  const minStartDate = getMinimumStartDateValue();
  if (
    Number.isNaN(selected.getTime()) ||
    formatDateInputValue(selected) !== raw ||
    raw < minStartDate
  ) {
    return {
      date: null,
      error: `Select a start date from ${minStartDate} or any future date.`,
    };
  }

  return { date: raw, error: null };
}

function normalizeDeviceId(value: unknown) {
  const deviceId = normalizeText(value);
  return /^[A-Za-z0-9_-]{12,120}$/.test(deviceId) ? deviceId : null;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Please log in before placing an order.' },
      { status: 401 }
    );
  }

  const userResult = await getUserFromAccessToken(accessToken);
  if (userResult.error || !userResult.data) {
    return NextResponse.json(
      { error: userResult.error ?? 'Invalid login session.' },
      { status: userResult.status || 401 }
    );
  }

  const body = (await request.json()) as CreateIntentBody;
  if (!body.items?.length || typeof body.subtotal !== 'number') {
    return NextResponse.json({ error: 'Cart items and subtotal are required.' }, { status: 400 });
  }

  if (body.items.length !== 1 || body.items.some((item) => item.quantity !== 1)) {
    return NextResponse.json(
      { error: 'Please order one item at a time. Free samples and meal plans must be ordered separately.' },
      { status: 400 }
    );
  }

  const isFreeSampleOrder = isFreeSampleCart(body.items);
  const hasMixedFreeSample = body.items.some((item) => item.itemType === 'free_sample') && !isFreeSampleOrder;
  if (hasMixedFreeSample) {
    return NextResponse.json(
      { error: 'Free samples must be ordered separately and only one sample can be requested.' },
      { status: 400 }
    );
  }

  const startDate = isFreeSampleOrder
    ? { date: null, error: null }
    : normalizeStartDate(body.requestedStartDate);
  if (startDate.error || (!isFreeSampleOrder && !startDate.date)) {
    return NextResponse.json({ error: startDate.error }, { status: 400 });
  }

  const freeSampleDeviceId = isFreeSampleOrder ? normalizeDeviceId(body.freeSampleDeviceId) : null;
  if (isFreeSampleOrder && !freeSampleDeviceId) {
    return NextResponse.json(
      { error: 'Could not verify this device for the one-time free sample limit. Refresh and try again.' },
      { status: 400 }
    );
  }

  const addressValidation = validateDeliveryAddress(body.deliveryAddress);
  if (addressValidation.error || !addressValidation.deliveryAddress) {
    return NextResponse.json({ error: addressValidation.error }, { status: 400 });
  }

  const addressPincodeValidation = await validateAddressPincodeMatch(addressValidation.deliveryAddress);
  if (!addressPincodeValidation.valid) {
    return NextResponse.json({ error: addressPincodeValidation.error }, { status: 400 });
  }

  const user = userResult.data;
  const profileResult = await supabaseRestFetch<CustomerProfile[]>(
    `/customer_profiles?user_id=eq.${user.id}&select=*`
  );
  const profile = profileResult.data?.[0] ?? null;

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error }, { status: profileResult.status || 500 });
  }

  if (!profile?.is_profile_complete) {
    return NextResponse.json({ error: 'Please complete your profile before placing an order.' }, { status: 403 });
  }

  const existingOrdersResult = await supabaseRestFetch<ApiOrder[]>(
    `/orders?user_id=eq.${user.id}&select=*`
  );

  if (existingOrdersResult.error) {
    return NextResponse.json({ error: existingOrdersResult.error }, { status: existingOrdersResult.status || 500 });
  }

  if (isFreeSampleOrder && freeSampleDeviceId) {
    const [deviceClaimResult, userClaimResult] = await Promise.all([
      supabaseRestFetch<FreeSampleDeviceClaim[]>(
        `/free_sample_device_claims?active=eq.true&device_id=eq.${encodeURIComponent(freeSampleDeviceId)}&select=*&limit=1`
      ),
      supabaseRestFetch<FreeSampleDeviceClaim[]>(
        `/free_sample_device_claims?active=eq.true&user_id=eq.${user.id}&select=*&limit=1`
      ),
    ]);

    if (deviceClaimResult.error || userClaimResult.error) {
      return NextResponse.json(
        { error: deviceClaimResult.error ?? userClaimResult.error },
        { status: deviceClaimResult.status || userClaimResult.status || 500 }
      );
    }

    const duplicateLegacyFreeSample = (existingOrdersResult.data ?? []).find(
      (order) => order.order_type === 'free_sample' && order.status !== 'cancelled'
    );

    if (deviceClaimResult.data?.[0]) {
      return NextResponse.json(
        { error: 'You already ordered a free sample from this device. Ask the chef to reset the device limit if needed.' },
        { status: 409 }
      );
    }

    if (userClaimResult.data?.[0] || duplicateLegacyFreeSample) {
      return NextResponse.json(
        { error: 'Only one free sample can be ordered per account. Ask the chef to reset your free sample limit if needed.' },
        { status: 409 }
      );
    }
  }

  const duplicateOrder = !isFreeSampleOrder
    ? (existingOrdersResult.data ?? []).find((order) => isBlockingOrder(order) && inferProgramKey(order.items) === inferProgramKey(body.items ?? []))
    : null;

  if (duplicateOrder) {
    return NextResponse.json(
      {
        error:
          duplicateOrder.status === 'new'
            ? 'You already have a pending order for this program. Complete payment or wait for the chef to cancel it before ordering again.'
            : 'You already have an active order for this program. You can order this program again after the current plan expires.',
      },
      { status: 409 }
    );
  }

  const subtotal = isFreeSampleOrder ? 0 : body.subtotal;
  const tax = isFreeSampleOrder ? 0 : Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const customerName = buildCustomerName(profile, user.user_metadata?.name ?? null, user.email ?? null);
  const whatsappNumber = getManualPaymentWhatsAppNumber();

  if (!whatsappNumber) {
    return NextResponse.json({ error: 'WhatsApp order number is not configured.' }, { status: 500 });
  }

  const result = await createCheckoutIntent({
    user_id: user.id,
    phone: addressValidation.deliveryAddress.phone,
    customer_name: customerName,
    items: body.items,
    subtotal,
    tax,
    total,
    order_type: isFreeSampleOrder ? 'free_sample' : 'paid_plan',
    delivery_address: addressValidation.deliveryAddress,
    requested_start_date: startDate.date,
    free_sample_device_id: freeSampleDeviceId,
  });

  if (result.error || !result.intent) {
    return NextResponse.json({ error: result.error ?? 'Could not create checkout request.' }, { status: result.status || 500 });
  }

  const message = buildCheckoutWhatsAppMessage(result.intent);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({ checkoutIntent: result.intent, whatsappUrl }, { status: 201 });
}
