import { NextResponse } from 'next/server';
import {
  buildCoachNotes,
  buildRecommendationSummary,
  getRecommendedPath,
} from '@/lib/customer-profile';
import type { CustomerProfile, CustomerProfilePayload } from '@/lib/backend-types';
import {
  getUserFromAccessToken,
  supabaseRestFetch,
} from '@/lib/supabase-rest';

function getAccessToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.replace(/^Bearer\s+/i, '');
}

async function getAuthenticatedUser(request: Request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return {
      error: NextResponse.json(
        { error: 'Please log in before editing your profile.' },
        { status: 401 }
      ),
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

  return {
    error: null,
    user: userResult.data,
  };
}

function validateProfile(body: Partial<CustomerProfilePayload>) {
  if (!body.full_name?.trim()) return 'Full name is required.';
  if (!Number.isFinite(body.age) || Number(body.age) < 13 || Number(body.age) > 100) {
    return 'Age must be between 13 and 100.';
  }
  if (!Number.isFinite(body.height_cm) || Number(body.height_cm) < 100 || Number(body.height_cm) > 250) {
    return 'Height must be between 100 cm and 250 cm.';
  }
  if (!Number.isFinite(body.weight_kg) || Number(body.weight_kg) < 25 || Number(body.weight_kg) > 300) {
    return 'Weight must be between 25 kg and 300 kg.';
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  if (!auth.user) {
    return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });
  }

  const { data, error, status } = await supabaseRestFetch<CustomerProfile[]>(
    `/customer_profiles?user_id=eq.${auth.user.id}&select=*`
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ profile: data?.[0] ?? null });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  if (!auth.user) {
    return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CustomerProfilePayload>;
  const validationError = validateProfile(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const profile: CustomerProfilePayload = {
    full_name: body.full_name!.trim(),
    age: Number(body.age),
    gender: body.gender ?? 'prefer-not-to-say',
    height_cm: Number(body.height_cm),
    weight_kg: Number(body.weight_kg),
    activity_level: body.activity_level ?? 'lightly-active',
    primary_goal: body.primary_goal ?? 'better-fitness',
    health_focus: body.health_focus ?? 'general',
    diet_preference: body.diet_preference ?? 'balanced',
    allergies: Array.isArray(body.allergies) ? body.allergies : [],
    health_notes: body.health_notes?.trim() ?? '',
  };

  const { data, error, status } = await supabaseRestFetch<CustomerProfile[]>(
    '/customer_profiles?on_conflict=user_id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: auth.user.id,
        ...profile,
        health_notes: profile.health_notes || null,
        recommended_path: getRecommendedPath(profile),
        recommendation_summary: buildRecommendationSummary(profile),
        coach_notes: buildCoachNotes(profile),
        is_profile_complete: true,
      }),
    }
  );

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ profile: data?.[0] ?? null });
}
