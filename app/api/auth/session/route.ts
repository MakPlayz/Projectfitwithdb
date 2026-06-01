import { NextResponse } from 'next/server';
import { supabaseAuthFetch } from '@/lib/supabase-rest';

interface RefreshBody {
  refreshToken?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RefreshBody;

    if (!body.refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required.' },
        { status: 400 }
      );
    }

    const { data, error, status } = await supabaseAuthFetch('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: body.refreshToken,
      }),
    });

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json(data ?? {});
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not refresh session.' },
      { status: 500 }
    );
  }
}
