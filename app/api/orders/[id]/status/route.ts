import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus, PaymentStatus } from '@/lib/backend-types';
import { requireAdminUser } from '@/lib/admin-auth';
import { sendFreeSampleApprovalButtons } from '@/lib/whatsapp';
import { inferPlanCalendarDaysFromItems } from '@/lib/plan-duration';

const statuses: ApiOrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'cancelled'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed'];

interface StatusBody {
  status?: ApiOrderStatus;
  payment_status?: PaymentStatus;
  action?: 'confirm' | 'cancel';
  confirmation_order_id?: string;
  confirmation_user_id?: string;
  payment_transaction_id?: string;
  cancellation_reason?: string;
  cancel_confirmation?: string;
}

function inferPlanDays(order: ApiOrder | null) {
  return inferPlanCalendarDaysFromItems(order?.items ?? []);
}

function isActivePaidPlan(order: ApiOrder) {
  return (
    order.order_type !== 'free_sample' &&
    ['confirmed', 'preparing', 'ready'].includes(order.status) &&
    order.payment_status === 'paid'
  );
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

  if (body.action === 'cancel') {
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

    const activePaidPlan = isActivePaidPlan(order);
    const cancelConfirmation = String(body.cancel_confirmation ?? '').trim().toLowerCase();

    if (activePaidPlan && cancelConfirmation !== 'confirm') {
      return NextResponse.json({ error: 'Type confirm to cancel an active plan.' }, { status: 400 });
    }

    const cancellationReason = String(body.cancellation_reason ?? '').trim();
    const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
      `/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          payment_status: activePaidPlan ? 'paid' : 'failed',
          cancellation_reason: cancellationReason || (activePaidPlan ? 'Active plan cancelled by chef.' : null),
        }),
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ order: data?.[0] ?? null });
  }

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

    const isFreeSampleOrder = order.order_type === 'free_sample';
    const enteredOrderId = String(body.confirmation_order_id ?? '').trim();
    const enteredUserId = String(body.confirmation_user_id ?? '').trim();
    const transactionId = String(body.payment_transaction_id ?? '').trim();

    if (!isFreeSampleOrder) {
      if (enteredOrderId !== order.id) {
        return NextResponse.json({ error: 'Entered order ID does not match this order.' }, { status: 400 });
      }

      if (!order.user_id || enteredUserId !== order.user_id) {
        return NextResponse.json({ error: 'Entered user ID does not match this order.' }, { status: 400 });
      }

      if (transactionId.length < 4) {
        return NextResponse.json({ error: 'Enter the payment transaction ID before confirming.' }, { status: 400 });
      }
    }

    const confirmedAt = new Date();
    const activatedAt = order.requested_start_date
      ? new Date(`${order.requested_start_date}T00:00:00`)
      : confirmedAt;
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + inferPlanDays(order));

    const confirmPayload = {
      status: 'confirmed',
      payment_status: 'paid',
      plan_activated_at: activatedAt.toISOString(),
      plan_expires_at: expiresAt.toISOString(),
      confirmed_at: confirmedAt.toISOString(),
      confirmed_by: admin.user?.id ?? null,
      payment_transaction_id: isFreeSampleOrder ? null : transactionId,
      cancellation_reason: null,
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

    const updatedOrder = data?.[0] ?? null;

    if (isFreeSampleOrder && updatedOrder) {
      await sendFreeSampleApprovalButtons(
        updatedOrder.delivery_address.phone,
        updatedOrder.id,
        updatedOrder.user_id
      ).catch(() => undefined);
    }

    return NextResponse.json({ order: updatedOrder });
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
