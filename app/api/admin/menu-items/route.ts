import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MenuItem } from '@/lib/backend-types';

type MenuItemBody = Partial<Pick<MenuItem, 'id' | 'name' | 'description' | 'price' | 'category' | 'active'>>;

function normalizeMenuItem(body: MenuItemBody) {
  return {
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim() || null,
    price: Number(body.price ?? 0),
    category: String(body.category ?? '').trim(),
    active: Boolean(body.active),
  };
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as MenuItemBody;
  const payload = normalizeMenuItem(body);
  if (!payload.name || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
    return NextResponse.json({ error: 'Menu item name, category, and valid price are required.' }, { status: 400 });
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
  if (!payload.name || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
    return NextResponse.json({ error: 'Menu item name, category, and valid price are required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<MenuItem[]>(`/menu_items?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ menuItem: result.data?.[0] ?? null });
}
