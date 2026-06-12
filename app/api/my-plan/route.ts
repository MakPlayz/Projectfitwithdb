import { NextResponse } from 'next/server';
import { getUserFromAccessToken, supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder } from '@/lib/backend-types';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Please log in to view your plan.' }, { status: 401 });
  }

  const userResult = await getUserFromAccessToken(accessToken);
  if (userResult.error || !userResult.data) {
    return NextResponse.json(
      { error: userResult.error ?? 'Invalid login session.' },
      { status: userResult.status || 401 }
    );
  }

  const result = await supabaseRestFetch<ApiOrder[]>(
    `/orders?user_id=eq.${userResult.data.id}&select=*&order=created_at.desc`
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    orders: result.data ?? [],
  });
}
