import { NextResponse } from 'next/server';
import { supabaseAuthFetch, supabaseRestFetch } from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { formatWhatsAppPhone, getInternalApiSecret } from '@/lib/whatsapp';
import type { AuthUser, ProjectFitUser } from '@/lib/backend-types';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  whatsappOptIn?: boolean;
}

interface SupabaseSignupResponse {
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(`signup:${getRequestIp(request)}`, 8, 60_000)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as SignupBody;
    const formattedPhone = body.phone ? formatWhatsAppPhone(body.phone) : null;

    if (!body.name || !body.email || !body.password || !formattedPhone) {
      return NextResponse.json(
        { error: 'Name, email, password, and a valid WhatsApp phone number are required.' },
        { status: 400 }
      );
    }

    const { data, error, status } = await supabaseAuthFetch<SupabaseSignupResponse>('/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        data: {
          name: body.name,
          phone: formattedPhone,
        },
      }),
    });

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const user = data?.user;

    if (user) {
      const optInAt = body.whatsappOptIn ? new Date().toISOString() : null;

      const userInsertResult = await supabaseRestFetch<ProjectFitUser[]>('/users', {
        method: 'POST',
        body: JSON.stringify({
          id: user.id,
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: formattedPhone,
          whatsapp_opt_in: Boolean(body.whatsappOptIn),
          whatsapp_opt_in_at: optInAt,
        }),
      });

      if (userInsertResult.error) {
        return NextResponse.json(
          { error: userInsertResult.error },
          { status: userInsertResult.status || 500 }
        );
      }

      if (body.whatsappOptIn) {
        const origin = new URL(request.url).origin;
        await fetch(`${origin}/api/whatsapp/welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-projectfit-internal-secret': getInternalApiSecret(),
          },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => undefined);
      }
    }

    return NextResponse.json(data ?? {}, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Signup failed.' },
      { status: 500 }
    );
  }
}
