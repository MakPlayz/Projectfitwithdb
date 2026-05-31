import { NextResponse } from 'next/server';
import { supabaseAuthFetch } from '@/lib/supabase-rest';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
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

  return NextResponse.json(data);
}
