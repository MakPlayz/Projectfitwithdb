import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MealPlan } from '@/lib/backend-types';

type MealPlanBody = Partial<Pick<MealPlan, 'id' | 'name' | 'description' | 'price' | 'duration' | 'active'>>;

function normalizeMealPlan(body: MealPlanBody) {
  return {
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim() || null,
    price: Number(body.price ?? 0),
    duration: String(body.duration ?? '').trim(),
    active: Boolean(body.active),
  };
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as MealPlanBody;
  const payload = normalizeMealPlan(body);
  if (!payload.name || !payload.duration || !Number.isFinite(payload.price) || payload.price < 0) {
    return NextResponse.json({ error: 'Meal plan name, duration, and valid price are required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<MealPlan[]>('/meal_plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ mealPlan: result.data?.[0] ?? null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as MealPlanBody;
  if (!body.id) return NextResponse.json({ error: 'Meal plan id is required.' }, { status: 400 });

  const payload = normalizeMealPlan(body);
  if (!payload.name || !payload.duration || !Number.isFinite(payload.price) || payload.price < 0) {
    return NextResponse.json({ error: 'Meal plan name, duration, and valid price are required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<MealPlan[]>(`/meal_plans?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ mealPlan: result.data?.[0] ?? null });
}
