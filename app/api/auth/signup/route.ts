import { NextResponse } from 'next/server';
import { supabaseAuthFetch, supabaseRestFetch } from '@/lib/supabase-rest';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { formatWhatsAppPhone, getInternalApiSecret } from '@/lib/whatsapp';
import type { AuthUser, ProjectFitUser, CustomerProfilePayload } from '@/lib/backend-types';
import { getRecommendedPath, buildRecommendationSummary, buildCoachNotes } from '@/lib/customer-profile';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  whatsappOptIn?: boolean;
  gender?: string;
  age?: number;
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
      body.weight === undefined
    ) {
      return NextResponse.json(
        { error: 'Name, email, password, WhatsApp phone number, age, gender, and weight are required.' },
        { status: 400 }
      );
    }

    const age = Number(body.age);
    if (!Number.isFinite(age) || age < 13 || age > 100) {
      return NextResponse.json({ error: 'Age must be between 13 and 100.' }, { status: 400 });
    }

    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 25 || weight > 300) {
      return NextResponse.json({ error: 'Weight must be between 25 kg and 300 kg.' }, { status: 400 });
    }

    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    if (!validGenders.includes(body.gender)) {
      return NextResponse.json({ error: 'Invalid gender selection.' }, { status: 400 });
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

      // Insert customer profile
      const profile: CustomerProfilePayload = {
        full_name: body.name.trim(),
        age: age,
        gender: body.gender as any,
        height_cm: 170, // Default since not in signup
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
