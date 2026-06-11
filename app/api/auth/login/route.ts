import { NextResponse } from 'next/server';
import { createMockAuthResponse } from '@/lib/mock-auth';
import { hasSupabaseConfig, supabaseAuthFetch } from '@/lib/supabase-rest';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(createMockAuthResponse({ email: body.email }));
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
