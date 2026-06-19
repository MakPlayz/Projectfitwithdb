import type { ApiOrder, PlanPauseRequest } from '@/lib/backend-types';
import { isMonthlyPlanItems, isWeeklyPlanItems } from '@/lib/plan-duration';

export const PLAN_PAUSE_TIME_ZONE = 'Asia/Kolkata';
const ONE_DAY_MS = 86_400_000;

export type PlanPauseKind = 'weekly' | 'monthly';

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PLAN_PAUSE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseDateKey(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const normalized = datePartsToKey(parts);
  return normalized === value ? parts : null;
}

function datePartsToKey(parts: DateParts) {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function keyToUtcMs(value: string) {
  const parts = parseDateKey(value);
  if (!parts) return NaN;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function addCalendarDays(dateKey: string, days: number) {
  const ms = keyToUtcMs(dateKey);
  if (!Number.isFinite(ms)) return null;
  return formatDateKey(new Date(ms + days * ONE_DAY_MS));
}

export function compareDateKeys(left: string, right: string) {
  return keyToUtcMs(left) - keyToUtcMs(right);
}

export function isSundayDateKey(dateKey: string) {
  const ms = keyToUtcMs(dateKey);
  return Number.isFinite(ms) && new Date(ms).getUTCDay() === 0;
}

export function eachDateKey(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor: string | null = startDate;

  while (cursor && compareDateKeys(cursor, endDate) <= 0) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }

  return dates;
}

export function getMinimumPauseStartDate(now = new Date()) {
  return addCalendarDays(formatDateKey(now), 2) ?? formatDateKey(now);
}

export function getPlanPauseKind(order: Pick<ApiOrder, 'items'>): PlanPauseKind | null {
  if (isMonthlyPlanItems(order.items)) return 'monthly';
  if (isWeeklyPlanItems(order.items)) return 'weekly';
  return null;
}

export function getPlanPauseLimit(order: Pick<ApiOrder, 'items'>) {
  const kind = getPlanPauseKind(order);
  if (kind === 'monthly') return 3;
  if (kind === 'weekly') return 1;
  return 0;
}

export function getDateKeyFromIso(value: string | null | undefined) {
  return value ? formatDateKey(new Date(value)) : null;
}

export function getPlanPauseWindow(order: Pick<ApiOrder, 'plan_activated_at' | 'plan_expires_at' | 'payment_stage' | 'remaining_payment_due_at'>) {
  const startDate = getDateKeyFromIso(order.plan_activated_at);
  const planEndDate = getDateKeyFromIso(order.plan_expires_at);

  if (!startDate || !planEndDate) {
    return null;
  }

  if (order.payment_stage === 'half_paid') {
    const dueDate = getDateKeyFromIso(order.remaining_payment_due_at);
    const paidWindowEnd = dueDate ? addCalendarDays(dueDate, -1) : null;
    if (!paidWindowEnd) return null;
    return {
      startDate,
      endDate: compareDateKeys(paidWindowEnd, planEndDate) < 0 ? paidWindowEnd : planEndDate,
    };
  }

  return { startDate, endDate: planEndDate };
}

export function isPauseEligibleOrder(order: ApiOrder, now = new Date()) {
  if (order.order_type === 'free_sample') return false;
  if (!['confirmed', 'preparing', 'ready'].includes(order.status)) return false;
  if (!['paid_full', 'half_paid'].includes(order.payment_stage)) return false;
  if (!order.plan_expires_at || new Date(order.plan_expires_at) < now) return false;
  return Boolean(getPlanPauseKind(order));
}

export function getSelectablePauseDates(order: ApiOrder, existingPauses: PlanPauseRequest[], now = new Date()) {
  const window = getPlanPauseWindow(order);
  if (!window) return [];

  const minimumStart = getMinimumPauseStartDate(now);
  const unavailable = new Set(
    existingPauses
      .filter((pause) => pause.order_id === order.id && pause.status === 'approved')
      .flatMap((pause) => pause.skipped_dates)
  );

  return eachDateKey(window.startDate, window.endDate).filter(
    (dateKey) =>
      compareDateKeys(dateKey, minimumStart) >= 0 &&
      !isSundayDateKey(dateKey) &&
      !unavailable.has(dateKey)
  );
}

export function getRequestedSkippedDates(startDate: string, endDate: string) {
  if (!parseDateKey(startDate) || !parseDateKey(endDate) || compareDateKeys(endDate, startDate) < 0) {
    return null;
  }

  return eachDateKey(startDate, endDate).filter((dateKey) => !isSundayDateKey(dateKey));
}

export function hasOverlappingPause(skippedDates: string[], pauses: PlanPauseRequest[]) {
  const requested = new Set(skippedDates);
  return pauses
    .filter((pause) => pause.status === 'approved')
    .some((pause) => pause.skipped_dates.some((dateKey) => requested.has(dateKey)));
}

export function addServiceDaysToIsoEndDate(isoEndDate: string, serviceDays: number) {
  const initialCursor = getDateKeyFromIso(isoEndDate);
  if (!initialCursor) return isoEndDate;

  let cursor = initialCursor;
  let added = 0;
  while (added < serviceDays) {
    if (!isSundayDateKey(cursor)) {
      added += 1;
    }
    cursor = addCalendarDays(cursor, 1) ?? cursor;
  }

  return `${cursor}T00:00:00.000+05:30`;
}

export function getPlanCategoryLabel(order: Pick<ApiOrder, 'items'>) {
  const kind = getPlanPauseKind(order);
  if (kind === 'monthly') return 'Month plan';
  if (kind === 'weekly') return 'Week plan';
  return 'Day plan';
}
