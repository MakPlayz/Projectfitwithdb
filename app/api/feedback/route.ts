import { NextResponse } from 'next/server';
import type { CustomerFeedback } from '@/lib/backend-types';
import { getUserFromAccessToken, supabaseRestFetch } from '@/lib/supabase-rest';

interface FeedbackBody {
  message?: string;
}

function getAccessToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
}

async function getAuthenticatedUser(request: Request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return {
      error: NextResponse.json({ error: 'Please log in before sending feedback.' }, { status: 401 }),
      user: null,
    };
  }

  const userResult = await getUserFromAccessToken(accessToken);
  if (userResult.error || !userResult.data) {
    return {
      error: NextResponse.json(
        { error: userResult.error ?? 'Invalid login session.' },
        { status: userResult.status || 401 }
      ),
      user: null,
    };
  }

  return { error: null, user: userResult.data };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  if (!auth.user) return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });

  const { data, error, status } = await supabaseRestFetch<CustomerFeedback[]>(
    `/customer_feedback?user_id=eq.${auth.user.id}&select=*&order=created_at.desc`
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ feedback: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  if (!auth.user) return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });

  const body = (await request.json()) as FeedbackBody;
  const message = body.message?.trim();

  if (!message || message.length < 5) {
    return NextResponse.json({ error: 'Feedback must be at least 5 characters.' }, { status: 400 });
  }

  if (message.length > 1200) {
    return NextResponse.json({ error: 'Feedback must be 1200 characters or less.' }, { status: 400 });
  }

  const { data, error, status } = await supabaseRestFetch<CustomerFeedback[]>('/customer_feedback', {
    method: 'POST',
    body: JSON.stringify({
      user_id: auth.user.id,
      message,
      status: 'new',
    }),
  });

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ feedback: data?.[0] ?? null }, { status: 201 });
}
