import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import type { FreeSampleDeviceClaim } from '@/lib/backend-types';
import { supabaseRestFetch } from '@/lib/supabase-rest';

interface ResetBody {
  user_id?: string;
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = (await request.json()) as ResetBody;
  const userId = body.user_id?.trim();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }

  const result = await supabaseRestFetch<FreeSampleDeviceClaim[]>(
    `/free_sample_device_claims?user_id=eq.${encodeURIComponent(userId)}&active=eq.true`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        active: false,
        reset_by: admin.user?.id ?? null,
        reset_at: new Date().toISOString(),
      }),
    }
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ resetCount: result.data?.length ?? 0 });
}
