import { NextResponse } from 'next/server';
import { createMockAuthResponse } from '@/lib/mock-auth';
import { canUseMockAuth, hasSupabaseConfig, supabaseAuthFetch } from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    // Throttle credential stuffing / brute force: 10 attempts/min per IP.
    if (isRateLimited(`login:${getRequestIp(request)}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as LoginBody;

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (canUseMockAuth()) {
      return NextResponse.json(createMockAuthResponse({ email: body.email }));
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Supabase auth is not configured. Add Supabase URL and public key in Vercel.' },
        { status: 500 }
      );
    }

    const { data, error, status } = await supabaseAuthFetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    });

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json(data ?? {});
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed.' },
      { status: 500 }
    );
  }
}
