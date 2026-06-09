import { NextResponse } from 'next/server';
import { supabaseRestFetch, getUserFromAccessToken } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus } from '@/lib/backend-types';

const statuses: ApiOrderStatus[] = ['new', 'preparing', 'ready'];

interface StatusBody {
  status?: ApiOrderStatus;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
      { error: 'Access denied. Only kitchen staff can update order status.' },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as StatusBody;

  if (!body.status || !statuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
  }

  const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
    `/orders?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: body.status,
      }),
    }
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ order: data?.[0] ?? null });
}
