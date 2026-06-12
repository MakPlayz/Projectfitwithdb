import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus, PaymentStatus } from '@/lib/backend-types';
import { requireAdminUser } from '@/lib/admin-auth';

const statuses: ApiOrderStatus[] = ['new', 'confirmed', 'preparing', 'ready'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed'];

interface StatusBody {
  status?: ApiOrderStatus;
  payment_status?: PaymentStatus;
  action?: 'confirm';
}

function inferPlanDays(order: ApiOrder | null) {
  const text = order?.items.map((item) => `${item.id} ${item.name}`).join(' ').toLowerCase() ?? '';

  if (text.includes('month') || text.includes('26/27')) return 27;
  if (text.includes('6-day') || text.includes('6 day') || text.includes('-6-')) return 6;
  return 1;
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

  if (body.action === 'confirm') {
    const current = await supabaseRestFetch<ApiOrder[]>(
      `/orders?id=eq.${encodeURIComponent(id)}&select=*`
    );

    if (current.error) {
      return NextResponse.json({ error: current.error }, { status: current.status });
    }

    const order = current.data?.[0] ?? null;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + inferPlanDays(order));

    const confirmPayload = {
      status: 'confirmed',
      payment_status: 'paid',
      plan_activated_at: activatedAt.toISOString(),
      plan_expires_at: expiresAt.toISOString(),
      confirmed_at: activatedAt.toISOString(),
      confirmed_by: admin.user?.id ?? null,
    };

    const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
      `/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(confirmPayload),
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ order: data?.[0] ?? null });
  }

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
