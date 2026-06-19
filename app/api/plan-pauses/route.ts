import { NextResponse } from 'next/server';
import type { ApiOrder, PlanPauseRequest } from '@/lib/backend-types';
import {
  addServiceDaysToIsoEndDate,
  compareDateKeys,
  getMinimumPauseStartDate,
  getPlanPauseKind,
  getPlanPauseLimit,
  getPlanPauseWindow,
  getRequestedSkippedDates,
  getSelectablePauseDates,
  hasOverlappingPause,
  isPauseEligibleOrder,
} from '@/lib/plan-pauses';
import { getUserFromAccessToken, supabaseRestFetch } from '@/lib/supabase-rest';

type PauseRequestBody = {
  orderId?: string;
  startDate?: string;
  endDate?: string;
};

function getAccessToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
}

async function getAuthenticatedUser(request: Request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return {
      response: NextResponse.json({ error: 'Please log in before pausing meals.' }, { status: 401 }),
      userId: null,
    };
  }

  const userResult = await getUserFromAccessToken(accessToken);
  if (userResult.error || !userResult.data) {
    return {
      response: NextResponse.json(
        { error: userResult.error ?? 'Invalid login session.' },
        { status: userResult.status || 401 }
      ),
      userId: null,
    };
  }

  return { response: null, userId: userResult.data.id };
}

async function loadUserPauseData(userId: string) {
  const [ordersResult, pausesResult] = await Promise.all([
    supabaseRestFetch<ApiOrder[]>(
      `/orders?user_id=eq.${encodeURIComponent(userId)}&order_type=eq.paid_plan&select=*&order=created_at.desc`
    ),
    supabaseRestFetch<PlanPauseRequest[]>(
      `/plan_pause_requests?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`
    ),
  ]);

  return { ordersResult, pausesResult };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });

  const { ordersResult, pausesResult } = await loadUserPauseData(auth.userId);

  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error }, { status: ordersResult.status });
  }
  if (pausesResult.error && pausesResult.status !== 404) {
    return NextResponse.json({ error: pausesResult.error }, { status: pausesResult.status });
  }

  const pauses = pausesResult.error ? [] : pausesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const eligibleOrders = orders
    .filter((order) => isPauseEligibleOrder(order))
    .map((order) => {
      const orderPauses = pauses.filter((pause) => pause.order_id === order.id && pause.status === 'approved');
      return {
        ...order,
        pause_kind: getPlanPauseKind(order),
        pause_limit: getPlanPauseLimit(order),
        pauses_used: orderPauses.length,
        pause_window: getPlanPauseWindow(order),
        selectable_pause_dates: getSelectablePauseDates(order, orderPauses),
      };
    });

  return NextResponse.json({
    eligibleOrders,
    pauses,
    minimumStartDate: getMinimumPauseStartDate(),
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.response) return auth.response;
  if (!auth.userId) return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });

  const body = (await request.json()) as PauseRequestBody;
  const orderId = body.orderId?.trim();
  const startDate = body.startDate?.trim();
  const endDate = body.endDate?.trim();

  if (!orderId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Choose a plan, start date, and end date.' }, { status: 400 });
  }

  const { ordersResult, pausesResult } = await loadUserPauseData(auth.userId);

  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error }, { status: ordersResult.status });
  }
  if (pausesResult.error && pausesResult.status !== 404) {
    return NextResponse.json({ error: pausesResult.error }, { status: pausesResult.status });
  }

  const order = (ordersResult.data ?? []).find((item) => item.id === orderId) ?? null;
  if (!order) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }
  if (!isPauseEligibleOrder(order)) {
    return NextResponse.json({ error: 'Only active week and month plans can pause meals.' }, { status: 400 });
  }

  const window = getPlanPauseWindow(order);
  if (!window || !order.plan_expires_at) {
    return NextResponse.json({ error: 'This plan does not have valid active dates.' }, { status: 400 });
  }

  const minimumStart = getMinimumPauseStartDate();
  if (compareDateKeys(startDate, minimumStart) < 0) {
    return NextResponse.json({ error: `Meal pauses can start from ${minimumStart} onward.` }, { status: 400 });
  }
  if (compareDateKeys(startDate, window.startDate) < 0 || compareDateKeys(endDate, window.endDate) > 0) {
    return NextResponse.json({ error: 'Selected dates must be inside your current paid plan window.' }, { status: 400 });
  }

  const skippedDates = getRequestedSkippedDates(startDate, endDate);
  if (!skippedDates || skippedDates.length === 0) {
    return NextResponse.json({ error: 'Select at least one non-Sunday delivery day.' }, { status: 400 });
  }

  const pauses = (pausesResult.error ? [] : pausesResult.data ?? []).filter((pause) => pause.order_id === order.id);
  const approvedPauses = pauses.filter((pause) => pause.status === 'approved');
  const pauseLimit = getPlanPauseLimit(order);

  if (approvedPauses.length >= pauseLimit) {
    return NextResponse.json(
      { error: `This ${getPlanPauseKind(order)} plan already used all ${pauseLimit} pause request${pauseLimit === 1 ? '' : 's'}.` },
      { status: 400 }
    );
  }
  if (hasOverlappingPause(skippedDates, approvedPauses)) {
    return NextResponse.json({ error: 'One or more selected days were already paused.' }, { status: 400 });
  }

  const previousPlanExpiresAt = order.plan_expires_at;
  const newPlanExpiresAt = addServiceDaysToIsoEndDate(previousPlanExpiresAt, skippedDates.length);
  const previousRemainingPaymentDueAt = order.remaining_payment_due_at;
  const shouldExtendRemainingPayment =
    order.payment_stage === 'half_paid' &&
    Boolean(previousRemainingPaymentDueAt) &&
    skippedDates.some((dateKey) => compareDateKeys(dateKey, getPlanPauseWindow(order)?.endDate ?? dateKey) <= 0);
  const newRemainingPaymentDueAt =
    shouldExtendRemainingPayment && previousRemainingPaymentDueAt
      ? addServiceDaysToIsoEndDate(previousRemainingPaymentDueAt, skippedDates.length)
      : previousRemainingPaymentDueAt;

  const pauseInsert = await supabaseRestFetch<PlanPauseRequest[]>('/plan_pause_requests', {
    method: 'POST',
    body: JSON.stringify({
      order_id: order.id,
      user_id: auth.userId,
      start_date: startDate,
      end_date: endDate,
      skipped_dates: skippedDates,
      extension_days: skippedDates.length,
      previous_plan_expires_at: previousPlanExpiresAt,
      new_plan_expires_at: newPlanExpiresAt,
      previous_remaining_payment_due_at: previousRemainingPaymentDueAt,
      new_remaining_payment_due_at: newRemainingPaymentDueAt,
      status: 'approved',
    }),
  });

  if (pauseInsert.error) {
    return NextResponse.json({ error: pauseInsert.error }, { status: pauseInsert.status });
  }

  const pause = pauseInsert.data?.[0] ?? null;
  const updateResult = await supabaseRestFetch<ApiOrder[]>(`/orders?id=eq.${encodeURIComponent(order.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      plan_expires_at: newPlanExpiresAt,
      remaining_payment_due_at: newRemainingPaymentDueAt,
    }),
  });

  if (updateResult.error) {
    if (pause) {
      await supabaseRestFetch<PlanPauseRequest[]>(`/plan_pause_requests?id=eq.${encodeURIComponent(pause.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      }).catch(() => undefined);
    }

    return NextResponse.json({ error: updateResult.error }, { status: updateResult.status });
  }

  return NextResponse.json({
    pause,
    order: updateResult.data?.[0] ?? null,
  });
}
