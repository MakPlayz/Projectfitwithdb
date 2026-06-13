import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MenuItem } from '@/lib/backend-types';

type MenuItemBody = Partial<
  Pick<
    MenuItem,
    | 'id'
    | 'name'
    | 'description'
    | 'price'
    | 'category'
    | 'program_slug'
    | 'photo_url'
    | 'servings'
    | 'protein_grams'
    | 'ingredients'
    | 'active'
  >
>;

function normalizeIngredients(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMenuItem(body: MenuItemBody) {
  const proteinValue = body.protein_grams as unknown;

  return {
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim() || null,
    price: 0,
    category: String(body.category ?? '').trim(),
    program_slug: String(body.program_slug ?? 'main').trim() || 'main',
    photo_url: String(body.photo_url ?? '').trim() || null,
    servings: Math.max(1, Number(body.servings ?? 1)),
    protein_grams:
      proteinValue === null || proteinValue === undefined || proteinValue === ''
        ? null
        : Number(proteinValue),
    ingredients: normalizeIngredients(body.ingredients),
    active: Boolean(body.active),
  };
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as MenuItemBody;
  const payload = normalizeMenuItem(body);
  if (
    !payload.name ||
    !payload.category ||
    !Number.isFinite(payload.servings) ||
    payload.servings < 1 ||
    (payload.protein_grams !== null && !Number.isFinite(payload.protein_grams))
  ) {
    return NextResponse.json({ error: 'Menu item name, category, and servings are required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<MenuItem[]>('/menu_items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ menuItem: result.data?.[0] ?? null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as MenuItemBody;
  if (!body.id) return NextResponse.json({ error: 'Menu item id is required.' }, { status: 400 });

  const payload = normalizeMenuItem(body);
  if (
    !payload.name ||
    !payload.category ||
    !Number.isFinite(payload.servings) ||
    payload.servings < 1 ||
    (payload.protein_grams !== null && !Number.isFinite(payload.protein_grams))
  ) {
    return NextResponse.json({ error: 'Menu item name, category, and servings are required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<MenuItem[]>(`/menu_items?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ menuItem: result.data?.[0] ?? null });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Menu item id is required.' }, { status: 400 });

  const result = await supabaseRestFetch<MenuItem[]>(`/menu_items?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deleted: true });
}
