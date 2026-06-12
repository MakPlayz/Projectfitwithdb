import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin-auth';
import { getProgramPlanOverrides } from '@/lib/program-plan-overrides';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { ApiOrder, CustomerProfile, MealPlan, MenuItem, ProjectFitUser } from '@/lib/backend-types';

export async function GET(request: Request) {
  const admin = await requireAdminUser(request);
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const [usersResult, profilesResult, ordersResult, menuResult, mealPlansResult, programOverrides] =
    await Promise.all([
      supabaseRestFetch<ProjectFitUser[]>('/users?select=*&order=created_at.desc'),
      supabaseRestFetch<CustomerProfile[]>('/customer_profiles?select=*&order=updated_at.desc'),
      supabaseRestFetch<ApiOrder[]>('/orders?select=*&order=created_at.desc'),
      supabaseRestFetch<MenuItem[]>('/menu_items?select=*&order=category.asc,name.asc'),
      supabaseRestFetch<MealPlan[]>('/meal_plans?select=*&order=name.asc'),
      getProgramPlanOverrides(),
    ]);

  const failed = [usersResult, profilesResult, ordersResult].find((result) => result.error);

  if (failed?.error) {
    return NextResponse.json({ error: failed.error }, { status: failed.status });
  }

  const warnings = [menuResult, mealPlansResult]
    .filter((result) => result.error)
    .map((result) => result.error as string);

  return NextResponse.json({
    users: usersResult.data ?? [],
    profiles: profilesResult.data ?? [],
    orders: ordersResult.data ?? [],
    menuItems: menuResult.error ? [] : menuResult.data ?? [],
    mealPlans: mealPlansResult.error ? [] : mealPlansResult.data ?? [],
    programOverrides,
    warnings,
  });
}
