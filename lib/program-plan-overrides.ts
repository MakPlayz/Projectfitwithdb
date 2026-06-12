import { getDietBySlug, type DietCategory, type DietPlan } from '@/data/diets';
import { supabaseRestFetch } from './supabase-rest';

export interface ProgramPlanOverride {
  plan_id: string;
  name: string | null;
  duration: string | null;
  price: number | null;
  highlight: string | null;
  active: boolean;
  updated_at: string;
}

export async function getProgramPlanOverrides() {
  try {
    const { data, error } = await supabaseRestFetch<ProgramPlanOverride[]>(
      '/program_plan_overrides?select=*'
    );

    if (error) {
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}

export async function getDietWithPlanOverrides(slug: string): Promise<DietCategory | undefined> {
  const diet = getDietBySlug(slug);
  if (!diet) return undefined;

  const overrides = await getProgramPlanOverrides();
  const overridesByPlanId = new Map(overrides.map((override) => [override.plan_id, override]));
  const plans = diet.plans
    .map((plan): DietPlan | null => {
      const override = overridesByPlanId.get(plan.id);
      if (!override) return plan;
      if (!override.active) return null;

      return {
        ...plan,
        name: override.name || plan.name,
        duration: override.duration || plan.duration,
        price: typeof override.price === 'number' ? override.price : plan.price,
        highlight: override.highlight || plan.highlight,
      };
    })
    .filter((plan): plan is DietPlan => Boolean(plan));

  return { ...diet, plans };
}
