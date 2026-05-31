import type { AuthUser } from '@/lib/backend-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your Vercel/local environment variables.`);
  }

  return value;
}

function getSupabaseUrl() {
  return requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
}

export async function supabaseAuthFetch<T>(
  path: string,
  init: RequestInit = {}
) {
  const url = `${getSupabaseUrl()}/auth/v1${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: requireEnv(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  return parseSupabaseResponse<T>(response);
}

export async function supabaseRestFetch<T>(
  path: string,
  init: RequestInit = {}
) {
  const url = `${getSupabaseUrl()}/rest/v1${path}`;
  const key = requireEnv(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });

  return parseSupabaseResponse<T>(response);
}

export async function getUserFromAccessToken(accessToken: string) {
  return supabaseAuthFetch<AuthUser>('/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function parseSupabaseResponse<T>(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.error_description ||
      data?.msg ||
      data?.message ||
      `Supabase request failed with ${response.status}`;

    return {
      data: null as T | null,
      error: message as string,
      status: response.status,
    };
  }

  return {
    data: data as T,
    error: null,
    status: response.status,
  };
}
