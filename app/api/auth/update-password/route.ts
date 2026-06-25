import { NextResponse } from 'next/server';
import { canUseMockAuth, hasSupabaseConfig, supabaseAuthFetch } from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';

interface UpdatePasswordBody {
  accessToken?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(`password-update:${getRequestIp(request)}`, 8, 60_000)) {
      return NextResponse.json(
        { error: 'Too many password update attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as UpdatePasswordBody;
    const accessToken = body.accessToken?.trim();
    const password = body.password ?? '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Reset link is missing or expired.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (canUseMockAuth()) {
      return NextResponse.json({ ok: true });
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Supabase auth is not configured. Add Supabase URL and public key in Vercel.' },
        { status: 500 }
      );
    }

    const { error, status } = await supabaseAuthFetch('/user', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update password.' },
      { status: 500 }
    );
  }
}
