import { NextResponse } from 'next/server';
import {
  getUserFromAccessToken,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import type { ApiOrder, CustomerProfile } from '@/lib/backend-types';
import type { CartItem } from '@/store/cartStore';

interface CreateOrderBody {
  items?: CartItem[];
  subtotal?: number;
}

export async function GET() {
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
    }),
  });

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ order: data?.[0] }, { status: 201 });
}
