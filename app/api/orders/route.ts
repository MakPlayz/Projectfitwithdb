import { NextResponse } from 'next/server';
import {
  getUserFromAccessToken,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import type { ApiOrder, CustomerProfile, DeliveryAddress } from '@/lib/backend-types';
import type { CartItem } from '@/store/cartStore';
import { isDeliverablePincode, isIncludedDeliveryPincode } from '@/lib/serviceable-pincodes';
import { requireAdminUser } from '@/lib/admin-auth';
import { validateAddressPincodeMatch } from '@/lib/delivery-address-validation';

interface CreateOrderBody {
  items?: CartItem[];
  subtotal?: number;
  deliveryAddress?: Partial<DeliveryAddress>;
  requestedStartDate?: string;
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

function buildManualPaymentMessage({
  order,
  userId,
  customerName,
  deliveryAddress,
}: {
  order: ApiOrder;
  userId: string;
  customerName: string | null;
  deliveryAddress: DeliveryAddress;
}) {
  const items = order.items
    .map((item) => `${item.quantity}x ${item.name}`)
    .join('\n');
  const deliveryNote = isIncludedDeliveryPincode(deliveryAddress.pincode)
    ? 'Delivery included in selected plan area'
    : 'Rapido parcel fare applies separately';

  return [
    'Hi Project Fit, I want to confirm my order.',
    '',
    `Order ID: ${order.id}`,
    `User ID: ${userId}`,
    `Name: ${customerName ?? 'Project Fit customer'}`,
    `Phone: ${deliveryAddress.phone}`,
    `Pincode: ${deliveryAddress.pincode}`,
    `Amount: Rs ${order.total.toLocaleString('en-IN')}`,
    `Requested start date: ${order.requested_start_date ?? 'Not selected'}`,
    `Delivery: ${deliveryNote}`,
    '',
    'Plan/items:',
    items,
    '',
    'Please send the QR payment scanner. I will share the payment screenshot after payment.',
  ].join('\n');
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

  return { deliveryAddress, error: null };
}

function getMinimumStartDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeStartDate(value: unknown) {
  const raw = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { date: null, error: 'Select when you want your meal plan to start.' };
  }

  const selected = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(selected.getTime()) || selected < getMinimumStartDate()) {
    return {
      date: null,
      error: 'Start date must be at least one full day after today.',
    };
  }

  return { date: raw, error: null };
}

function inferProgramKey(items: CartItem[]) {
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

function isBlockingOrder(order: ApiOrder) {
  if (order.status === 'cancelled' || order.payment_status === 'failed') return false;
  if (order.status === 'new') return true;
  if (!order.plan_expires_at) return ['confirmed', 'preparing', 'ready'].includes(order.status);
  return new Date(order.plan_expires_at) >= new Date();
}

export async function GET(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
    '/orders?select=*&order=created_at.desc'
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const orders = data ?? [];
  const userIds = Array.from(
    new Set(orders.map((order) => order.user_id).filter((value): value is string => Boolean(value)))
  );

  let profilesByUserId = new Map<string, CustomerProfile>();

  if (userIds.length > 0) {
    const profileResult = await supabaseRestFetch<CustomerProfile[]>(
      `/customer_profiles?select=*&user_id=in.(${userIds.join(',')})`
    );

    if (!profileResult.error && profileResult.data) {
      profilesByUserId = new Map(
        profileResult.data.map((profile) => [profile.user_id, profile])
      );
    }
  }

  return NextResponse.json(
    {
      orders: orders.map((order) => ({
        ...order,
        customer_profile: order.user_id ? profilesByUserId.get(order.user_id) ?? null : null,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
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

  const body = (await request.json()) as CreateOrderBody;
  if (!body.items?.length || typeof body.subtotal !== 'number') {
    return NextResponse.json(
      { error: 'Cart items and subtotal are required.' },
      { status: 400 }
    );
  }

  const startDate = normalizeStartDate(body.requestedStartDate);
  if (startDate.error || !startDate.date) {
    return NextResponse.json({ error: startDate.error }, { status: 400 });
  }

  const addressValidation = validateDeliveryAddress(body.deliveryAddress);
  if (addressValidation.error || !addressValidation.deliveryAddress) {
    return NextResponse.json(
      { error: addressValidation.error },
      { status: 400 }
    );
  }

  const tax = Math.round(body.subtotal * 0.05);
  const total = body.subtotal + tax;
  const user = userResult.data;
  const programKey = inferProgramKey(body.items);
  const existingOrdersResult = await supabaseRestFetch<ApiOrder[]>(
    `/orders?user_id=eq.${user.id}&select=*`
  );

  if (existingOrdersResult.error) {
    return NextResponse.json(
      { error: existingOrdersResult.error },
      { status: existingOrdersResult.status || 500 }
    );
  }

  const duplicateOrder = (existingOrdersResult.data ?? []).find(
    (order) => isBlockingOrder(order) && inferProgramKey(order.items) === programKey
  );

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

  const profileResult = await supabaseRestFetch<CustomerProfile[]>(
    `/customer_profiles?user_id=eq.${user.id}&select=*`
  );
  const profile = profileResult.data?.[0] ?? null;

  if (profileResult.error) {
    return NextResponse.json(
      { error: profileResult.error },
      { status: profileResult.status || 500 }
    );
  }

  if (!profile?.is_profile_complete) {
    return NextResponse.json(
      { error: 'Please complete your profile before placing an order.' },
      { status: 403 }
    );
  }

  const customerName =
    profile.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email ||
    null;
  const whatsappNumber = getManualPaymentWhatsAppNumber();

  if (!whatsappNumber) {
    return NextResponse.json(
      { error: 'Manual payment WhatsApp number is not configured.' },
      { status: 500 }
    );
  }

  const addressPincodeValidation = await validateAddressPincodeMatch(addressValidation.deliveryAddress);
  if (!addressPincodeValidation.valid) {
    return NextResponse.json(
      { error: addressPincodeValidation.error },
      { status: 400 }
    );
  }

  const { data, error, status } = await supabaseRestFetch<ApiOrder[]>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      user_id: user.id,
      customer_name: customerName,
      items: body.items,
      subtotal: body.subtotal,
      tax,
      total,
      status: 'new',
      payment_status: 'pending',
      delivery_address: addressValidation.deliveryAddress,
      requested_start_date: startDate.date,
    }),
  });

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const order = data?.[0];

  if (!order) {
    return NextResponse.json({ error: 'Could not create local order.' }, { status: 500 });
  }

  const message = buildManualPaymentMessage({
    order,
    userId: user.id,
    customerName,
    deliveryAddress: addressValidation.deliveryAddress,
  });
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({ order, whatsappUrl }, { status: 201 });
}
