import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ProgramPlanOverride } from '@/lib/program-plan-overrides';

type ProgramPlanBody = Partial<ProgramPlanOverride>;

export async function PATCH(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as ProgramPlanBody;
  const planId = String(body.plan_id ?? '').trim();
  if (!planId) {
    return NextResponse.json({ error: 'Program plan id is required.' }, { status: 400 });
  }

  const price = body.price === null || body.price === undefined
    ? null
    : Number(body.price);
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: 'Program plan price must be zero or more.' }, { status: 400 });
  }

  let customPrices: Record<string, number> | null = null;
  if (body.custom_prices != null) {
    const allowedSlots = ['breakfast', 'lunch', 'dinner'];
    customPrices = {};
    for (const [slot, value] of Object.entries(body.custom_prices)) {
      if (!allowedSlots.includes(slot)) continue;
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return NextResponse.json({ error: `${slot} price must be zero or more.` }, { status: 400 });
      }
      customPrices[slot] = numericValue;
    }
  }

  const payload = {
    plan_id: planId,
    name: String(body.name ?? '').trim() || null,
    duration: String(body.duration ?? '').trim() || null,
    price,
    highlight: String(body.highlight ?? '').trim() || null,
    active: body.active !== false,
    custom_prices: customPrices,
  };

  const result = await supabaseRestFetch<ProgramPlanOverride[]>('/program_plan_overrides?on_conflict=plan_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ programPlan: result.data?.[0] ?? null });
}
