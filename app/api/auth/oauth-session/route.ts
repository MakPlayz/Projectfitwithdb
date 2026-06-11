import { NextRequest, NextResponse } from 'next/server';

const sessionCookie = 'projectfit.oauth.session';

export async function GET(request: NextRequest) {
  const raw = request.cookies.get(sessionCookie)?.value;
  let response: NextResponse;

  try {
    response = raw
      ? NextResponse.json(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
      : NextResponse.json({ error: 'OAuth session expired.' }, { status: 401 });
  } catch {
    response = NextResponse.json({ error: 'OAuth session expired.' }, { status: 401 });
  }

  response.cookies.delete(sessionCookie);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
