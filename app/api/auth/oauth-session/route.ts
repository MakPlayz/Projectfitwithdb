import { NextRequest, NextResponse } from 'next/server';

const sessionCookie = 'projectfit.oauth.session';
const sessionCookieCount = `${sessionCookie}.count`;

function readSessionCookie(request: NextRequest) {
  const legacyCookie = request.cookies.get(sessionCookie)?.value;
  if (legacyCookie) return legacyCookie;

  const count = Number(request.cookies.get(sessionCookieCount)?.value ?? 0);
  if (!Number.isInteger(count) || count < 1 || count > 8) return null;

  const chunks: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const chunk = request.cookies.get(`${sessionCookie}.${i}`)?.value;
    if (!chunk) return null;
    chunks.push(chunk);
  }

  return chunks.join('');
}

function deleteSessionCookies(response: NextResponse) {
  response.cookies.delete(sessionCookie);
  response.cookies.delete(sessionCookieCount);

  for (let i = 0; i < 8; i += 1) {
    response.cookies.delete(`${sessionCookie}.${i}`);
  }
}

export async function GET(request: NextRequest) {
  const raw = readSessionCookie(request);
  let response: NextResponse;

  try {
    response = raw
      ? NextResponse.json(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
      : NextResponse.json({ error: 'OAuth session expired.' }, { status: 401 });
  } catch {
    response = NextResponse.json({ error: 'OAuth session expired.' }, { status: 401 });
  }

  deleteSessionCookies(response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
