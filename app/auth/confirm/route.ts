import { NextResponse } from 'next/server';
import { getSupabaseUrl, supabaseAuthFetch } from '@/lib/supabase-rest';
import type { AuthUser } from '@/lib/backend-types';

interface VerifyResponse {
  user?: AuthUser;
  access_token?: string;
}

const allowedTypes = new Set([
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email',
  'email_change',
]);

function getSafeNextUrl(request: Request, nextPath: string | null, type: string) {
  const requestUrl = new URL(request.url);
  const fallback =
    type === 'recovery'
      ? new URL('/reset-password', requestUrl.origin)
      : new URL('/login?confirmed=1', requestUrl.origin);

  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return fallback;
  }

  return new URL(nextPath, requestUrl.origin);
}

async function sendWelcomeEmail(user?: AuthUser) {
  if (!user?.email) return;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceRoleKey) return;

  const name = user.user_metadata?.name || user.user_metadata?.full_name;

  await fetch(`${getSupabaseUrl()}/functions/v1/send-welcome-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      name,
    }),
  }).catch(() => undefined);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') ?? 'signup';
  const nextUrl = getSafeNextUrl(request, requestUrl.searchParams.get('next'), type);

  if (!tokenHash || !allowedTypes.has(type)) {
    nextUrl.searchParams.set('confirmed', '0');
    nextUrl.searchParams.set('error', 'invalid_confirmation_link');
    return NextResponse.redirect(nextUrl);
  }

  const { data, error } = await supabaseAuthFetch<VerifyResponse>('/verify', {
    method: 'POST',
    body: JSON.stringify({
      token_hash: tokenHash,
      type,
    }),
  });

  if (error) {
    nextUrl.searchParams.set('confirmed', '0');
    nextUrl.searchParams.set('error', 'confirmation_failed');
    return NextResponse.redirect(nextUrl);
  }

  if (type === 'signup') {
    await sendWelcomeEmail(data?.user);
  }

  if (type === 'recovery' && data?.access_token) {
    nextUrl.hash = new URLSearchParams({ access_token: data.access_token }).toString();
  }

  nextUrl.searchParams.set('confirmed', '1');
  return NextResponse.redirect(nextUrl);
}
