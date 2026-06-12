import type { AuthUser } from '@/lib/backend-types';

export interface ProjectFitSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser;
}

const sessionKey = 'projectfit.session';
const authEvent = 'projectfit-auth-changed';

export function saveSession(session: ProjectFitSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
  window.dispatchEvent(new Event(authEvent));
}

export function getSession(): ProjectFitSession | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProjectFitSession;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event(authEvent));
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

function isUsableAccessToken(token: string) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(header) || !/^[A-Za-z0-9_-]+$/.test(payload)) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(signature) || signature.length < 16) return false;

    const normalizedHeader = header.replace(/-/g, '+').replace(/_/g, '/');
    const parsedHeader = JSON.parse(atob(normalizedHeader)) as { alg?: string };
    return Boolean(parsedHeader.alg && parsedHeader.alg.toLowerCase() !== 'none');
  } catch {
    return false;
  }
}

export function getAccessTokenExpiry(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  return payload?.exp ? payload.exp * 1000 : null;
}

function isExpiringSoon(session: ProjectFitSession) {
  if (!session.expiresAt) {
    return false;
  }

  return session.expiresAt <= Date.now() + 60_000;
}

export async function refreshSession() {
  const current = getSession();

  if (!current?.refreshToken) {
    clearSession();
    return null;
  }

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: current.refreshToken,
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    clearSession();
    return null;
  }

  const nextSession: ProjectFitSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current.refreshToken,
    expiresAt: getAccessTokenExpiry(data.access_token),
    user: data.user ?? current.user,
  };

  saveSession(nextSession);
  return nextSession;
}

export async function ensureSession() {
  const current = getSession();

  if (!current) {
    return null;
  }

  if (!isUsableAccessToken(current.accessToken)) {
    clearSession();
    return null;
  }

  if (!isExpiringSoon(current)) {
    return current;
  }

  return refreshSession();
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await ensureSession();

  return session
    ? {
        Authorization: `Bearer ${session.accessToken}`,
      }
    : {};
}
