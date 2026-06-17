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
import { formatWhatsAppPhone } from '@/lib/whatsapp';

interface ProfileRequestBody extends Partial<CustomerProfilePayload> {
  phone?: string;
}

const maxMedicalReportBytes = 1_500_000;
const allowedMedicalReportTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

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

function validateProfile(body: ProfileRequestBody) {
  if (!body.full_name?.trim()) return 'Full name is required.';
  if (!body.phone || !formatWhatsAppPhone(body.phone)) return 'Valid WhatsApp number is required.';
  if (!Number.isFinite(body.age) || Number(body.age) < 13 || Number(body.age) > 100) {
    return 'Age must be between 13 and 100.';
  }
  if (!Number.isFinite(body.height_cm) || Number(body.height_cm) <= 0) {
    return 'Enter a valid height.';
  }
  if (!Number.isFinite(body.weight_kg) || Number(body.weight_kg) < 25 || Number(body.weight_kg) > 300) {
    return 'Weight must be between 25 kg and 300 kg.';
  }
  if (!body.gender) return 'Gender is required.';
  if (!body.health_notes?.trim()) return 'Health notes are required. Enter "None" if there are no concerns.';
  if (body.medical_report_file_data) {
    if (!body.medical_report_file_name?.trim()) return 'Medical report file name is required.';
    if (!body.medical_report_file_type || !allowedMedicalReportTypes.has(body.medical_report_file_type)) {
      return 'Upload a PDF, JPG, PNG, or WebP report file.';
    }
    if (body.medical_report_file_data.length > maxMedicalReportBytes * 1.4) {
      return 'Medical report file must be below 1.5 MB.';
    }
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

  const userResult = await supabaseRestFetch<{ phone?: string; name?: string }[]>(
    `/users?id=eq.${auth.user.id}&select=name,phone`
  );

  return NextResponse.json({
    profile: data?.[0] ?? null,
    user: userResult.error ? null : userResult.data?.[0] ?? null,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  if (!auth.user) {
    return NextResponse.json({ error: 'Invalid login session.' }, { status: 401 });
  }
  if (!auth.user.email) {
    return NextResponse.json({ error: 'Email is required before saving profile.' }, { status: 400 });
  }
  const email = auth.user.email.trim().toLowerCase();

  const body = (await request.json()) as ProfileRequestBody;
  const validationError = validateProfile(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const formattedPhone = formatWhatsAppPhone(body.phone!);
  if (!formattedPhone) {
    return NextResponse.json({ error: 'Valid WhatsApp number is required.' }, { status: 400 });
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
    medical_report_file_name: body.medical_report_file_data ? body.medical_report_file_name?.trim() ?? null : null,
    medical_report_file_type: body.medical_report_file_data ? body.medical_report_file_type ?? null : null,
    medical_report_file_data: body.medical_report_file_data ?? null,
    medical_report_uploaded_at: body.medical_report_file_data ? new Date().toISOString() : null,
  };

  const userResult = await supabaseRestFetch('/users?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      id: auth.user.id,
      name: profile.full_name,
      email,
      phone: formattedPhone,
    }),
  });

  if (userResult.error) {
    return NextResponse.json(
      { error: `User details update failed: ${userResult.error}` },
      { status: userResult.status || 500 }
    );
  }

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
        medical_report_file_name: profile.medical_report_file_name,
        medical_report_file_type: profile.medical_report_file_type,
        medical_report_file_data: profile.medical_report_file_data,
        medical_report_uploaded_at: profile.medical_report_uploaded_at,
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
