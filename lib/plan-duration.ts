import type { ApiOrder } from '@/lib/backend-types';
import type { CartItem } from '@/store/cartStore';

export const MONTHLY_PLAN_CALENDAR_DAYS = 30;
export const MONTHLY_PLAN_SERVICE_DAYS = 26;
const PLAN_TIME_ZONE = 'Asia/Kolkata';
const ONE_DAY_MS = 86_400_000;

type DateValue = {
  year: number;
  month: number;
  day: number;
};

function getPlanText(items: CartItem[]) {
  return items.map((item) => `${item.id} ${item.name}`).join(' ').toLowerCase();
}

function isMonthlyPlanText(text: string) {
  return (
    text.includes('month') ||
    text.includes('monthly') ||
    text.includes('custom') ||
    text.includes('30 day') ||
    text.includes('30-day') ||
    text.includes('26 service') ||
    text.includes('26/27')
  );
}

export function isMonthlyPlanItems(items: CartItem[]) {
  return isMonthlyPlanText(getPlanText(items));
}

export function inferPlanCalendarDaysFromItems(items: CartItem[]) {
  const text = getPlanText(items);

  if (isMonthlyPlanText(text)) return MONTHLY_PLAN_CALENDAR_DAYS;
  if (text.includes('6-day') || text.includes('6 day') || text.includes('-6-')) return 6;
  return 1;
}

export function inferPlanServiceDaysFromItems(items: CartItem[]) {
  const text = getPlanText(items);

  if (isMonthlyPlanText(text)) return MONTHLY_PLAN_SERVICE_DAYS;
  if (text.includes('6-day') || text.includes('6 day') || text.includes('-6-')) return 6;
  return 1;
}

function getDateValueInTimeZone(value: Date, timeZone = PLAN_TIME_ZONE): DateValue {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? value.getUTCFullYear()),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? value.getUTCMonth() + 1),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? value.getUTCDate()),
  };
}

function dateValueFromIso(value: string): DateValue {
  return getDateValueInTimeZone(new Date(value));
}

function toUtcMs(value: DateValue) {
  return Date.UTC(value.year, value.month - 1, value.day);
}

function compareDateValues(left: DateValue, right: DateValue) {
  return toUtcMs(left) - toUtcMs(right);
}

function addDays(value: DateValue, days: number): DateValue {
  return getDateValueInTimeZone(new Date(toUtcMs(value) + days * ONE_DAY_MS), 'UTC');
}

function isSunday(value: DateValue) {
  return new Date(toUtcMs(value)).getUTCDay() === 0;
}

function serviceDaysElapsedBeforeToday(start: DateValue, today: DateValue, end: DateValue) {
  if (compareDateValues(today, start) <= 0) return 0;

  let cursor = start;
  const stop = compareDateValues(today, end) > 0 ? end : today;
  let elapsed = 0;

  while (compareDateValues(cursor, stop) < 0) {
    if (!isSunday(cursor)) elapsed += 1;
    cursor = addDays(cursor, 1);
  }

  return elapsed;
}

export function getOrderServiceDaysRemaining(order: Pick<ApiOrder, 'items' | 'plan_activated_at' | 'plan_expires_at'>, now = new Date()) {
  if (!order.plan_activated_at || !order.plan_expires_at) return null;

  const start = dateValueFromIso(order.plan_activated_at);
  const end = dateValueFromIso(order.plan_expires_at);
  const today = getDateValueInTimeZone(now);

  if (compareDateValues(today, end) >= 0) return 0;

  const totalServiceDays = inferPlanServiceDaysFromItems(order.items);
  const elapsed = serviceDaysElapsedBeforeToday(start, today, end);

  return Math.max(0, totalServiceDays - elapsed);
}
