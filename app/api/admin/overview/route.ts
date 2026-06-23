import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { getProgramPlanOverrides } from '@/lib/program-plan-overrides';
import { supabaseAuthAdminFetch, supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, CustomerFeedback, CustomerProfile, HomepageAd, HomepageAdSettings, MealPlan, MenuItem, PlanPauseRequest, ProjectFitUser, WhatsAppMessageLog } from '@/lib/backend-types';

type AuthAdminUser = {
  id: string;
  email?: string;
  phone?: string;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  created_at?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    phone?: string;
  };
};

type AuthUsersResponse = {
  users?: AuthAdminUser[];
};

function mergeUsers(appUsers: ProjectFitUser[], authUsers: AuthAdminUser[]) {
  const usersById = new Map(appUsers.map((user) => [user.id, user]));

  for (const authUser of authUsers) {
    if (!authUser.email_confirmed_at && !authUser.phone_confirmed_at) continue;
    if (usersById.has(authUser.id)) continue;

    usersById.set(authUser.id, {
      id: authUser.id,
      name:
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Verified user',
      email: authUser.email ?? '',
      phone: authUser.phone || authUser.user_metadata?.phone || '',
      whatsapp_opt_in: false,
      whatsapp_opt_in_at: null,
      created_at: authUser.created_at ?? new Date().toISOString(),
    });
  }

  return Array.from(usersById.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function GET(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const [usersResult, authUsersResult, profilesResult, ordersResult, menuResult, mealPlansResult, feedbackResult, whatsappResult, planPausesResult, homepageAdsResult, homepageAdSettingsResult, programOverrides] =
    await Promise.all([
      supabaseRestFetch<ProjectFitUser[]>('/users?select=*&order=created_at.desc'),
      supabaseAuthAdminFetch<AuthUsersResponse>('/admin/users?per_page=1000'),
      supabaseRestFetch<CustomerProfile[]>('/customer_profiles?select=*&order=updated_at.desc'),
      supabaseRestFetch<ApiOrder[]>('/orders?select=*&order=created_at.desc'),
      supabaseRestFetch<MenuItem[]>('/menu_items?select=*&order=category.asc,name.asc'),
      supabaseRestFetch<MealPlan[]>('/meal_plans?select=*&order=name.asc'),
      supabaseRestFetch<CustomerFeedback[]>('/customer_feedback?select=*&order=created_at.desc'),
      supabaseRestFetch<WhatsAppMessageLog[]>('/whatsapp_message_logs?select=*&order=created_at.desc&limit=400'),
      supabaseRestFetch<PlanPauseRequest[]>('/plan_pause_requests?select=*&order=created_at.desc'),
      supabaseRestFetch<HomepageAd[]>('/homepage_ads?select=*&order=priority.asc,created_at.desc'),
      supabaseRestFetch<HomepageAdSettings[]>('/homepage_ad_settings?id=eq.true&select=*&limit=1'),
      getProgramPlanOverrides(),
    ]);

  const failed = [usersResult, profilesResult, ordersResult].find((result) => result.error);

  if (failed?.error) {
    return NextResponse.json({ error: failed.error }, { status: failed.status });
  }

  const warnings = [authUsersResult, menuResult, mealPlansResult, feedbackResult, whatsappResult, planPausesResult, homepageAdsResult, homepageAdSettingsResult]
    .filter((result) => result.error)
    .map((result) => result.error as string);
  const users = mergeUsers(usersResult.data ?? [], authUsersResult.data?.users ?? []);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const feedback = (feedbackResult.error ? [] : feedbackResult.data ?? []).map((item) => {
    const user = usersById.get(item.user_id);
    return {
      ...item,
      customer_name: user?.name ?? null,
      customer_email: user?.email ?? null,
    };
  });

  return NextResponse.json({
    users,
    profiles: profilesResult.data ?? [],
    orders: ordersResult.data ?? [],
    menuItems: menuResult.error ? [] : menuResult.data ?? [],
    mealPlans: mealPlansResult.error ? [] : mealPlansResult.data ?? [],
    feedback,
    whatsappMessages: whatsappResult.error ? [] : whatsappResult.data ?? [],
    planPauseRequests: planPausesResult.error ? [] : planPausesResult.data ?? [],
    homepageAds: homepageAdsResult.error ? [] : homepageAdsResult.data ?? [],
    homepageAdSettings: homepageAdSettingsResult.error ? { enabled: false } : homepageAdSettingsResult.data?.[0] ?? { enabled: false },
    programOverrides,
    warnings,
  });
}
