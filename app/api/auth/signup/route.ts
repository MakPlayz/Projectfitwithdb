import { NextResponse } from 'next/server';
import { createMockAuthResponse } from '@/lib/mock-auth';
import {
  canUseMockAuth,
  hasSupabaseConfig,
  supabaseAuthFetch,
  supabaseRestFetch,
} from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { formatWhatsAppPhone, getInternalApiSecret } from '@/lib/whatsapp';
import type { AuthUser, ProjectFitUser, CustomerProfilePayload, GenderIdentity } from '@/lib/backend-types';
import { getRecommendedPath, buildRecommendationSummary, buildCoachNotes } from '@/lib/customer-profile';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  healthNotes?: string;
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

    if (
      !body.name ||
      !body.email ||
      !body.password ||
      !formattedPhone ||
      !body.gender ||
      body.age === undefined ||
      body.height === undefined ||
      body.weight === undefined
    ) {
      return NextResponse.json(
        { error: 'Name, email, password, WhatsApp phone number, age, height, gender, and weight are required.' },
        { status: 400 }
      );
    }

    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 13 || age > 100) {
      return NextResponse.json({ error: 'Age must be between 13 and 100.' }, { status: 400 });
    }

    const height = Number(body.height);
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json({ error: 'Enter a valid height.' }, { status: 400 });
    }

    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 25 || weight > 300) {
      return NextResponse.json({ error: 'Weight must be between 25 kg and 300 kg.' }, { status: 400 });
    }

    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    if (!validGenders.includes(body.gender)) {
      return NextResponse.json({ error: 'Invalid gender selection.' }, { status: 400 });
    }

    if (canUseMockAuth()) {
      return NextResponse.json(
        createMockAuthResponse({
          email: body.email,
          name: body.name,
          phone: formattedPhone,
        }),
        { status: 201 }
      );
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Supabase auth is not configured. Add Supabase URL and public key in Vercel.' },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/login?confirmed=1`;

    const { data, error, status } = await supabaseAuthFetch<SupabaseSignupResponse>(
      `/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
      method: 'POST',
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        data: {
          name: body.name,
          phone: formattedPhone,
        },
      }),
      }
    );

    if (error) {
      const cleanError = /already registered|already exists|user already/i.test(error)
        ? 'This email is already registered. Please sign in instead.'
        : error;
      return NextResponse.json({ error: cleanError }, { status });
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

      const isUsersTableMissing =
        userInsertResult.status === 404 &&
        /public\.users|table .*users|schema cache/i.test(userInsertResult.error ?? '');

      if (userInsertResult.error && !isUsersTableMissing) {
        return NextResponse.json(
          { error: userInsertResult.error },
          { status: userInsertResult.status || 500 }
        );
      }

      // Insert customer profile
      const profile: CustomerProfilePayload = {
        full_name: body.name.trim(),
        age: age,
        gender: body.gender as GenderIdentity,
        height_cm: height,
        weight_kg: weight,
        activity_level: 'lightly-active',
        primary_goal: 'better-fitness',
        health_focus: 'general',
        diet_preference: 'balanced',
        allergies: [],
        health_notes: body.healthNotes?.trim() ?? '',
      };

      const profileInsertResult = await supabaseRestFetch('/customer_profiles', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          ...profile,
          health_notes: profile.health_notes || null,
          recommended_path: getRecommendedPath(profile),
          recommendation_summary: buildRecommendationSummary(profile),
          coach_notes: buildCoachNotes(profile),
          is_profile_complete: true,
        }),
      });

      if (profileInsertResult.error) {
        return NextResponse.json(
          { error: `Profile creation failed: ${profileInsertResult.error}` },
          { status: profileInsertResult.status || 500 }
        );
      }

      if (body.whatsappOptIn && !isUsersTableMissing) {
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
