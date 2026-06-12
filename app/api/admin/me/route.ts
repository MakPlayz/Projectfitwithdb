import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const admin = await requireAdminUser(request);

  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  return NextResponse.json({ user: admin.user });
}
