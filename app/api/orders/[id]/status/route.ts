import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus, PaymentStatus } from '@/lib/backend-types';
import { requireAdminUser } from '@/lib/admin-auth';

const statuses: ApiOrderStatus[] = ['new', 'preparing', 'ready'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed'];

interface StatusBody {
  status?: ApiOrderStatus;
  payment_status?: PaymentStatus;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  const body = (await request.json()) as StatusBody;

  if (body.status && !statuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
  }

  if (body.payment_status && !paymentStatuses.includes(body.payment_status)) {
    return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });
  }

  const payload: Partial<Pick<ApiOrder, 'status' | 'payment_status'>> = {};
  if (body.status) {
    payload.status = body.status;
  }
  if (body.payment_status) {
    payload.payment_status = body.payment_status;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Order status or payment status is required.' }, { status: 400 });
  }

  const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
    `/orders?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ order: data?.[0] ?? null });
}
