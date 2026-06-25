import { NextResponse } from 'next/server';
import { createAdminSessionCookie, adminSessionCookie } from '@/lib/admin-session';
import { requireAdminUser } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: adminSessionCookie.name,
      value: createAdminSessionCookie(admin.user ?? {}),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/chef',
      maxAge: adminSessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create admin session.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: adminSessionCookie.name,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/chef',
    maxAge: 0,
  });
  return response;
}
