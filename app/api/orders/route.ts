import { NextResponse } from 'next/server';
import {
  getUserFromAccessToken,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import type { ApiOrder } from '@/lib/backend-types';
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

  return NextResponse.json(
    { orders: data ?? [] },
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
  const customerName =
    user.user_metadata?.name || user.user_metadata?.full_name || user.email || null;

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
