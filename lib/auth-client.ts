import type { AuthUser } from '@/lib/backend-types';

export interface ProjectFitSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser;
}

const sessionKey = 'projectfit.session';
const chefSessionKey = 'projectfit.chef.session';
const authEvent = 'projectfit-auth-changed';
const chefAuthEvent = 'projectfit-chef-auth-changed';

function saveSessionForKey(session: ProjectFitSession, key: string, eventName: string) {
  localStorage.setItem(key, JSON.stringify(session));
  window.dispatchEvent(new Event(eventName));
}

function getSessionForKey(key: string): ProjectFitSession | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProjectFitSession;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function clearSessionForKey(key: string, eventName: string) {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event(eventName));
}

export function saveSession(session: ProjectFitSession) {
  saveSessionForKey(session, sessionKey, authEvent);
}

export function getSession(): ProjectFitSession | null {
  return getSessionForKey(sessionKey);
}

export function clearSession() {
  clearSessionForKey(sessionKey, authEvent);
}

export function saveChefSession(session: ProjectFitSession) {
  saveSessionForKey(session, chefSessionKey, chefAuthEvent);
}

export function getChefSession(): ProjectFitSession | null {
  return getSessionForKey(chefSessionKey);
}

export function clearChefSession() {
  clearSessionForKey(chefSessionKey, chefAuthEvent);
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

async function refreshSessionForScope(options: {
  getCurrentSession: () => ProjectFitSession | null;
  saveCurrentSession: (session: ProjectFitSession) => void;
  clearCurrentSession: () => void;
}) {
  const current = options.getCurrentSession();

  if (!current?.refreshToken) {
    options.clearCurrentSession();
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
    options.clearCurrentSession();
    return null;
  }

  const nextSession: ProjectFitSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current.refreshToken,
    expiresAt: getAccessTokenExpiry(data.access_token),
    user: data.user ?? current.user,
  };

  options.saveCurrentSession(nextSession);
  return nextSession;
}

export async function refreshSession() {
  return refreshSessionForScope({
    getCurrentSession: getSession,
    saveCurrentSession: saveSession,
    clearCurrentSession: clearSession,
  });
}

export async function refreshChefSession() {
  return refreshSessionForScope({
    getCurrentSession: getChefSession,
    saveCurrentSession: saveChefSession,
    clearCurrentSession: clearChefSession,
  });
}

async function ensureSessionForScope(options: {
  getCurrentSession: () => ProjectFitSession | null;
  clearCurrentSession: () => void;
  refreshCurrentSession: () => Promise<ProjectFitSession | null>;
}) {
  const current = options.getCurrentSession();

  if (!current) {
    return null;
  }

  if (!isUsableAccessToken(current.accessToken)) {
    options.clearCurrentSession();
    return null;
  }

  if (!isExpiringSoon(current)) {
    return current;
  }

  return options.refreshCurrentSession();
}

export async function ensureSession() {
  return ensureSessionForScope({
    getCurrentSession: getSession,
    clearCurrentSession: clearSession,
    refreshCurrentSession: refreshSession,
  });
}

export async function ensureChefSession() {
  return ensureSessionForScope({
    getCurrentSession: getChefSession,
    clearCurrentSession: clearChefSession,
    refreshCurrentSession: refreshChefSession,
  });
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await ensureSession();

  return session
    ? {
        Authorization: `Bearer ${session.accessToken}`,
      }
    : {};
}

export async function getChefAuthHeaders(): Promise<Record<string, string>> {
  const session = await ensureChefSession();

  return session
    ? {
        Authorization: `Bearer ${session.accessToken}`,
      }
    : {};
}

export { authEvent, chefAuthEvent };
