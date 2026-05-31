import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus } from '@/lib/backend-types';

const statuses: ApiOrderStatus[] = ['new', 'preparing', 'ready'];

interface StatusBody {
  status?: ApiOrderStatus;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
