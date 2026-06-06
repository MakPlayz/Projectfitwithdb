import { NextResponse } from 'next/server';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { getInternalApiSecret, sendWelcomeTemplate } from '@/lib/whatsapp';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ProjectFitUser } from '@/lib/backend-types';

interface WelcomeBody {
  userId?: string;
}

export async function POST(request: Request) {
  if (isRateLimited(`whatsapp-welcome:${getRequestIp(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Too many WhatsApp welcome requests.' },
      { status: 429 }
    );
  }

  const internalSecret = request.headers.get('x-projectfit-internal-secret');

  if (internalSecret !== getInternalApiSecret()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json()) as WelcomeBody;

  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  const { data, error, status } = await supabaseRestFetch<ProjectFitUser[]>(
    `/users?id=eq.${encodeURIComponent(body.userId)}&select=*&limit=1`
  );
  const user = data?.[0] ?? null;

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const result = await sendWelcomeTemplate(user);
  return NextResponse.json(result);
}
