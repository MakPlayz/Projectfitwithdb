import type { AuthUser } from '@/lib/backend-types';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function requireEnv(value: string | undefined, name: string) {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    throw new Error(`Missing ${name}. Add it to your Vercel/local environment variables.`);
  }

  return normalized;
}

function normalizeEnv(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.trim().replace(/^['"]|['"]$/g, '');
}

export function getSupabaseUrl() {
  return requireEnv(
    supabaseUrl,
    'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL'
  ).replace(/\/$/, '');
}

export function getPublicKey() {
  return requireEnv(
    publicKey,
    [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ].join(' or ')
  );
}

function getServiceRoleKey() {
  const normalizedKey = normalizeEnv(serviceRoleKey);
  if (normalizedKey) {
    return normalizedKey;
  }
  const normalizedPubKey = normalizeEnv(publicKey);
  if (normalizedPubKey) {
    return normalizedPubKey;
  }
  return requireEnv(
    serviceRoleKey,
    'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY'
  );
}

export function hasSupabaseConfig() {
  return Boolean(normalizeEnv(supabaseUrl) && normalizeEnv(publicKey));
}

export async function supabaseAuthFetch<T>(
  path: string,
  init: RequestInit = {}
) {
  const url = `${getSupabaseUrl()}/auth/v1${path}`;
  const key = getPublicKey();
  const response = await safeFetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  return parseSupabaseResponse<T>(response);
}

export async function supabaseAuthAdminFetch<T>(
  path: string,
  init: RequestInit = {}
) {
  const url = `${getSupabaseUrl()}/auth/v1${path}`;
  const key = getServiceRoleKey();
  const response = await safeFetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
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
  const key = getServiceRoleKey();
  const response = await safeFetch(url, {
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
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return {
      data: null as T | null,
      error: text || `Supabase returned an invalid response with ${response.status}`,
      status: response.status,
    };
  }

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

async function safeFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    const target = new URL(input).origin;
    const reason =
      error instanceof Error && error.message ? error.message : 'Unknown network error';

    throw new Error(
      `Could not reach Supabase at ${target}. Check your Supabase URL/key env vars and redeploy after updating them. Original error: ${reason}`
    );
  }
}
