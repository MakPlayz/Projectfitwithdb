import type { AuthUser } from '@/lib/backend-types';

interface MockAuthInput {
  email: string;
  name?: string;
  phone?: string | null;
}

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createMockToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64Url({
    sub: user.id,
    email: user.email,
    aud: 'authenticated',
    role: 'authenticated',
    exp: now + 60 * 60 * 24 * 7,
    iat: now,
    iss: 'projectfit-local-auth',
  });

  return `${header}.${payload}.local-development-signature`;
}

function getMockUserId(email: string) {
  const normalized = email.trim().toLowerCase();
  return `local-${Buffer.from(normalized).toString('base64url').slice(0, 24)}`;
}

export function createMockAuthResponse({ email, name, phone }: MockAuthInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const user: AuthUser = {
    id: getMockUserId(normalizedEmail),
    email: normalizedEmail,
    user_metadata: {
      name: name?.trim() || normalizedEmail.split('@')[0],
      phone: phone ?? undefined,
    },
  };

  return {
    access_token: createMockToken(user),
    refresh_token: `local-refresh-${user.id}`,
    expires_in: 60 * 60 * 24 * 7,
    token_type: 'bearer',
    user,
    local_bypass: true,
  };
}
