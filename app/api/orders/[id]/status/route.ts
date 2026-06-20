import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, ApiOrderStatus, PaymentStatus } from '@/lib/backend-types';
import { requireAdminUser } from '@/lib/admin-auth';
import {
  sendFreeSampleApprovalButtons,
  sendOrderCancellationMessage,
  sendPlanActivatedMessage,
  sendRemainingPaymentReminderTemplate,
  sendPlanStoppedMidwayMessage,
  sendRemainingPaymentConfirmedMessage,
} from '@/lib/whatsapp';
import { addServiceDaysToIsoStartDate, inferPlanServiceDaysFromItems } from '@/lib/plan-duration';

const statuses: ApiOrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed'];

interface StatusBody {
  status?: ApiOrderStatus;
  payment_status?: PaymentStatus;
  action?: 'confirm' | 'cancel' | 'complete_payment' | 'send_payment_reminder' | 'stop_midway';
  confirmation_order_id?: string;
  confirmation_user_id?: string;
  payment_transaction_id?: string;
  cancellation_reason?: string;
  cancel_confirmation?: string;
}

function inferPlanDays(order: ApiOrder | null) {
  return inferPlanServiceDaysFromItems(order?.items ?? []);
}

function isActivePaidPlan(order: ApiOrder) {
  return (
    order.order_type !== 'free_sample' &&
    ['confirmed', 'preparing', 'ready'].includes(order.status) &&
    order.payment_status === 'paid'
  );
}

async function captureWhatsAppWarning(sendMessage: () => Promise<unknown>) {
  try {
    await sendMessage();
    return null;
  } catch (error) {
    return error instanceof Error
      ? `Order updated, but WhatsApp could not be sent: ${error.message}`
      : 'Order updated, but WhatsApp could not be sent.';
  }
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
          cancellation_reason: cancellationReason || null,
        }),
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const updatedOrder = data?.[0] ?? null;

    const whatsappWarning = updatedOrder
      ? await captureWhatsAppWarning(() => sendOrderCancellationMessage(updatedOrder))
      : null;

    return NextResponse.json({ order: updatedOrder, whatsappWarning });
  }

  if (
    body.action === 'complete_payment' ||
    body.action === 'send_payment_reminder' ||
    body.action === 'stop_midway'
  ) {
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

    if (order.payment_option !== 'half') {
      return NextResponse.json({ error: 'This action is only available for half-payment plans.' }, { status: 400 });
    }

    if (body.action === 'send_payment_reminder') {
      if (order.payment_stage !== 'half_paid') {
        return NextResponse.json({ error: 'Remaining payment reminders are only available for half-paid plans.' }, { status: 400 });
      }

      const whatsappWarning = await captureWhatsAppWarning(() => sendRemainingPaymentReminderTemplate(order));

      return NextResponse.json({
        order,
        whatsappWarning,
        reminderSent: !whatsappWarning,
      });
    }

    if (body.action === 'complete_payment') {
      const enteredOrderId = String(body.confirmation_order_id ?? '').trim();
      const enteredUserId = String(body.confirmation_user_id ?? '').trim();
      const transactionId = String(body.payment_transaction_id ?? '').trim();

      if (enteredOrderId !== order.id) {
        return NextResponse.json({ error: 'Entered order ID does not match this order.' }, { status: 400 });
      }

      if (!order.user_id || enteredUserId !== order.user_id) {
        return NextResponse.json({ error: 'Entered user ID does not match this order.' }, { status: 400 });
      }

      if (transactionId.length < 4) {
        return NextResponse.json({ error: 'Enter the remaining payment transaction ID.' }, { status: 400 });
      }

      const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
        `/orders?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'confirmed',
            payment_status: 'paid',
            payment_stage: 'paid_full',
            remaining_payment_paid_at: new Date().toISOString(),
            payment_transaction_id: transactionId,
            cancellation_reason: null,
            completion_reason: null,
          }),
        }
      );

      if (error) return NextResponse.json({ error }, { status });

      const updatedOrder = data?.[0] ?? null;
      const whatsappWarning = updatedOrder
        ? await captureWhatsAppWarning(() => sendRemainingPaymentConfirmedMessage(updatedOrder))
        : null;

      return NextResponse.json({ order: updatedOrder, whatsappWarning });
    }

    const reason = String(body.cancellation_reason ?? '').trim() || 'Customer chose to end the monthly plan after the first half.';
    const { data, error, status } = await supabaseRestFetch<ApiOrder[]>(
      `/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          payment_stage: 'stopped_midway',
          payment_status: 'paid',
          plan_completed_at: new Date().toISOString(),
          completion_reason: reason,
        }),
      }
    );

    if (error) return NextResponse.json({ error }, { status });

    const updatedOrder = data?.[0] ?? null;
    const whatsappWarning = updatedOrder
      ? await captureWhatsAppWarning(() => sendPlanStoppedMidwayMessage(updatedOrder))
      : null;

    return NextResponse.json({ order: updatedOrder, whatsappWarning });
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
    const expiresAt = addServiceDaysToIsoStartDate(activatedAt, inferPlanDays(order));

    const isHalfPaymentOrder = !isFreeSampleOrder && order.payment_option === 'half';
    const dueAt = addServiceDaysToIsoStartDate(activatedAt, 10);

    const confirmPayload = {
      status: 'confirmed',
      payment_status: isHalfPaymentOrder ? 'pending' : 'paid',
      payment_stage: isFreeSampleOrder ? 'paid_full' : isHalfPaymentOrder ? 'half_paid' : 'paid_full',
      plan_activated_at: activatedAt.toISOString(),
      plan_expires_at: expiresAt,
      remaining_payment_due_at: isHalfPaymentOrder ? dueAt : null,
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

    const whatsappWarning = updatedOrder
      ? await captureWhatsAppWarning(() =>
          isFreeSampleOrder
            ? sendFreeSampleApprovalButtons(
                updatedOrder.delivery_address.phone,
                updatedOrder.id,
                updatedOrder.user_id
              )
            : sendPlanActivatedMessage(updatedOrder)
        )
      : null;

    return NextResponse.json({ order: updatedOrder, whatsappWarning });
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
