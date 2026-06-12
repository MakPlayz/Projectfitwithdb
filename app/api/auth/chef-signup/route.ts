import { NextResponse } from 'next/server';
import { createMockAuthResponse } from '@/lib/mock-auth';
import {
  canUseMockAuth,
  hasSupabaseConfig,
  supabaseAuthFetch,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import type { AuthUser, ProjectFitUser } from '@/lib/backend-types';

interface ChefSignupBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
}

interface SupabaseSignupResponse {
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePhone(phone: string | undefined) {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return '';
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChefSignupBody;
    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const phone = normalizePhone(body.phone);
    const adminEmails = getAdminEmails();

    if (!adminEmails.length) {
      return NextResponse.json(
        { error: 'Chef signup is not configured. Add ADMIN_EMAILS in environment variables.' },
        { status: 500 }
      );
    }

    if (!name || !email || !body.password || !phone) {
      return NextResponse.json(
        { error: 'Name, email, password, and WhatsApp number are required.' },
        { status: 400 }
      );
    }

    if (!adminEmails.includes(email)) {
      return NextResponse.json(
        { error: 'This email is not allowed for chef portal access.' },
        { status: 403 }
      );
    }

    if (canUseMockAuth()) {
      return NextResponse.json(createMockAuthResponse({ email, name, phone }), { status: 201 });
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Supabase auth is not configured. Add Supabase URL and public key in Vercel.' },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;
    const { data, error, status } = await supabaseAuthFetch<SupabaseSignupResponse>(
      `/signup?redirect_to=${encodeURIComponent(`${origin}/chef?confirmed=1`)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: body.password,
          data: { name, phone, role: 'chef' },
        }),
      }
    );

    if (error) {
      const cleanError = /already registered|already exists|user already/i.test(error)
        ? 'This chef email is already registered. Please sign in instead.'
        : error;
      return NextResponse.json({ error: cleanError }, { status });
    }

    if (data?.user) {
      await supabaseRestFetch<ProjectFitUser[]>('/users?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id: data.user.id,
          name,
          email,
          phone,
          whatsapp_opt_in: false,
          whatsapp_opt_in_at: null,
        }),
      });
    }

    return NextResponse.json(data ?? {}, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chef signup failed.' },
      { status: 500 }
    );
  }
}
