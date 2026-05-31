import type { AuthUser } from '@/lib/backend-types';

export interface ProjectFitSession {
  accessToken: string;
  user: AuthUser;
}

const sessionKey = 'projectfit.session';

export function saveSession(session: ProjectFitSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
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
}

export function getAuthHeaders(): Record<string, string> {
  const session = getSession();

  return session
    ? {
        Authorization: `Bearer ${session.accessToken}`,
      }
    : {};
}
