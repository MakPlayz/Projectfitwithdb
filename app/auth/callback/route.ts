import { NextRequest, NextResponse } from 'next/server';
import { getPublicKey, getSupabaseUrl } from '@/lib/supabase-rest';
import type { AuthUser } from '@/lib/backend-types';

const verifierCookie = 'projectfit.oauth.verifier';
const stateCookie = 'projectfit.oauth.state';
const sessionCookie = 'projectfit.oauth.session';

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: AuthUser & {
    created_at?: string;
    last_sign_in_at?: string;
  };
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
}

function getSafeNextPath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function getSecureCookieFlag(request: Request) {
  return new URL(request.url).protocol === 'https:';
}

function isLikelyNewUser(user: OAuthTokenResponse['user']) {
  if (!user?.created_at) return false;

  const createdAt = Date.parse(user.created_at);
  if (!Number.isFinite(createdAt)) return false;

  return Date.now() - createdAt < 2 * 60 * 1000;
}

async function sendGoogleWelcomeEmail(user: OAuthTokenResponse['user']) {
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

async function exchangeCodeForSession(code: string, verifier: string) {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      apikey: getPublicKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier,
    }),
  });

  const text = await response.text();
  let data: OAuthTokenResponse | null = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Google sign-in returned an invalid response.');
  }

  if (!response.ok || !data?.access_token || !data.user) {
    throw new Error(
      data?.error_description ||
        data?.message ||
        data?.msg ||
        data?.error ||
        'Google sign-in failed.'
    );
  }

  return data;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const verifier = request.cookies.get(verifierCookie)?.value;
  const expectedState = request.cookies.get(stateCookie)?.value;

  const buildRedirect = (error?: string) => {
    const redirectUrl = new URL('/auth/callback/complete', requestUrl.origin);
    redirectUrl.searchParams.set('next', nextPath);
    if (error) {
      redirectUrl.searchParams.set('error', error);
    }

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(verifierCookie);
    response.cookies.delete(stateCookie);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };

  const response = buildRedirect();
  response.cookies.delete(verifierCookie);
  response.cookies.delete(stateCookie);

  if (!code || !verifier || !state || state !== expectedState) {
    return buildRedirect('invalid_google_callback');
  }

  try {
    const data = await exchangeCodeForSession(code, verifier);
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_in: data.expires_in ?? null,
      token_type: data.token_type ?? 'bearer',
      user: data.user,
    };
    const secure = getSecureCookieFlag(request);

    if (isLikelyNewUser(data.user)) {
      await sendGoogleWelcomeEmail(data.user);
    }

    response.cookies.set(sessionCookie, Buffer.from(JSON.stringify(session)).toString('base64url'), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 60,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return buildRedirect('google_signin_failed');
  }
}
