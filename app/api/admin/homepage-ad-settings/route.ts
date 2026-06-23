import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { HomepageAdSettings } from '@/lib/backend-types';

export async function PATCH(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as { enabled?: boolean };
  const result = await supabaseRestFetch<HomepageAdSettings[]>('/homepage_ad_settings?id=eq.true', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: Boolean(body.enabled) }),
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ settings: result.data?.[0] ?? null });
}
