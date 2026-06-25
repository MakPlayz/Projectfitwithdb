import { createHmac, timingSafeEqual } from 'crypto';

const cookieName = 'projectfit.chef.admin';
const maxAgeSeconds = 8 * 60 * 60;

type AdminSessionPayload = {
  sub: string;
  email: string;
  exp: number;
};

function getSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.PROJECTFIT_INTERNAL_API_SECRET ||
    process.env.WHATSAPP_APP_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error('Set ADMIN_SESSION_SECRET to a strong random value before enabling chef portal access.');
  }

  return secret;
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
}

export function createAdminSessionCookie(user: { id?: string; email?: string | null }) {
  if (!user.id || !user.email) {
    throw new Error('Admin user id and email are required.');
  }

  const payload: AdminSessionPayload = {
    sub: user.id,
    email: user.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionCookie(value: string | undefined) {
  if (!value) return null;

  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!payload.sub || !payload.email || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const adminSessionCookie = {
  name: cookieName,
  maxAge: maxAgeSeconds,
};
