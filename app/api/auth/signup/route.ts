import { NextResponse } from 'next/server';
import { supabaseAuthFetch } from '@/lib/supabase-rest';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SignupBody;

  if (!body.name || !body.email || !body.password) {
    return NextResponse.json(
      { error: 'Name, email, and password are required.' },
      { status: 400 }
    );
  }

  const { data, error, status } = await supabaseAuthFetch('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      data: {
        name: body.name,
      },
    }),
  });

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
