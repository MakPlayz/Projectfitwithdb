import { NextResponse } from 'next/server';
import { canUseMockAuth, hasSupabaseConfig, supabaseAuthFetch } from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';

interface ResetPasswordBody {
  email?: string;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(`password-reset:${getRequestIp(request)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as ResetPasswordBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
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

    const redirectTo = `${new URL(request.url).origin}/reset-password`;
    const { error, status } = await supabaseAuthFetch(
      `/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send reset email.' },
      { status: 500 }
    );
  }
}
