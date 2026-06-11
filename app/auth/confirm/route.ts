import { NextResponse } from 'next/server';
import { supabaseAuthFetch } from '@/lib/supabase-rest';

const allowedTypes = new Set([
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email',
  'email_change',
]);

function getSafeNextUrl(request: Request, nextPath: string | null) {
  const requestUrl = new URL(request.url);
  const fallback = new URL('/login?confirmed=1', requestUrl.origin);

  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return fallback;
  }

  return new URL(nextPath, requestUrl.origin);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') ?? 'signup';
  const nextUrl = getSafeNextUrl(request, requestUrl.searchParams.get('next'));

  if (!tokenHash || !allowedTypes.has(type)) {
    nextUrl.searchParams.set('confirmed', '0');
    nextUrl.searchParams.set('error', 'invalid_confirmation_link');
    return NextResponse.redirect(nextUrl);
  }

  const { error } = await supabaseAuthFetch('/verify', {
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

  nextUrl.searchParams.set('confirmed', '1');
  return NextResponse.redirect(nextUrl);
}
