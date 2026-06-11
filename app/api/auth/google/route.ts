import { randomBytes, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseUrl, hasSupabaseConfig } from '@/lib/supabase-rest';

const verifierCookie = 'projectfit.oauth.verifier';
const stateCookie = 'projectfit.oauth.state';

function base64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getSecureCookieFlag(request: Request) {
  return new URL(request.url).protocol === 'https:';
}

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.redirect(new URL('/login?error=google_unavailable', request.url));
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const next = requestUrl.searchParams.get('next') || '/';
  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('state', state);
  callbackUrl.searchParams.set('next', next.startsWith('/') && !next.startsWith('//') ? next : '/');

  const authorizeUrl = new URL('/auth/v1/authorize', getSupabaseUrl());
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', callbackUrl.toString());
  authorizeUrl.searchParams.set('flow_type', 'pkce');
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 's256');
  authorizeUrl.searchParams.set('scopes', 'openid email profile');

  const response = NextResponse.redirect(authorizeUrl);
  const secure = getSecureCookieFlag(request);

  response.cookies.set(verifierCookie, verifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 10 * 60,
  });
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 10 * 60,
  });

  response.headers.set('Cache-Control', 'no-store');
  return response;
}
