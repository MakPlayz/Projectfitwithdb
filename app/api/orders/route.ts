import { NextResponse } from 'next/server';
import {
  getUserFromAccessToken,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import type { ApiOrder, CustomerProfile, DeliveryAddress } from '@/lib/backend-types';
import type { CartItem } from '@/store/cartStore';
import { isDeliverablePincode, isIncludedDeliveryPincode } from '@/lib/serviceable-pincodes';

interface CreateOrderBody {
  items?: CartItem[];
  subtotal?: number;
  deliveryAddress?: Partial<DeliveryAddress>;
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Authentication required. Please log in.' },
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

  const user = userResult.data;
  if (!user.email?.toLowerCase().endsWith('@projectfitvizag.com')) {
    return NextResponse.json(
      { error: 'Access denied. Only kitchen staff can access orders.' },
      { status: 403 }
    );
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
