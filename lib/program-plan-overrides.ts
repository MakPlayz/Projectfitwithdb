import { getDietBySlug, type DietCategory, type DietMeal, type DietPlan } from '@/data/diets';
import type { MenuItem } from '@/lib/backend-types';
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

function normalizeMealType(value: string): DietMeal['mealType'] | undefined {
  const normalized = value.toLowerCase();
  if (['breakfast', 'lunch', 'dinner', 'snack', 'juice'].includes(normalized)) {
    return normalized as DietMeal['mealType'];
  }
  return undefined;
}

function mapMenuItemToDietMeal(item: MenuItem, fallbackImage: string): DietMeal {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? (item.ingredients.join(', ') || 'Chef prepared meal.'),
    image: item.photo_url?.startsWith('/') ? item.photo_url : fallbackImage,
    calories: 0,
    protein: Math.round(Number(item.protein_grams ?? 0)),
    carbs: 0,
    fat: 0,
    price: item.price,
    mealType: normalizeMealType(item.category),
  };
}

async function getProgramMeals(slug: string, fallbackImage: string) {
  try {
    const { data, error } = await supabaseRestFetch<MenuItem[]>(
      `/menu_items?active=eq.true&program_slug=eq.${encodeURIComponent(slug)}&select=*&order=category.asc,name.asc`
    );

    if (error) {
      return [];
    }

    return (data ?? []).map((item) => mapMenuItemToDietMeal(item, fallbackImage));
  } catch {
    return [];
  }
}

export async function getDietWithPlanOverrides(slug: string): Promise<DietCategory | undefined> {
  const diet = getDietBySlug(slug);
  if (!diet) return undefined;

  const [overrides, meals] = await Promise.all([
    getProgramPlanOverrides(),
    getProgramMeals(slug, diet.image),
  ]);
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

  return { ...diet, plans, meals };
}
