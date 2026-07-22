import type { CartItem } from '@/store/cartStore';
import { getDietWithPlanOverrides } from '@/lib/program-plan-overrides';
import type { DietMeal, DietPlan, DietSlug } from '@/data/diets';
import { formatMealSlots, getDefaultMealSlots, normalizeMealSlots } from '@/lib/meal-slots';

type TrustedCheckoutPricing =
  | {
      ok: true;
      items: CartItem[];
      subtotal: number;
      tax: number;
      total: number;
      orderType: 'paid_plan' | 'free_sample';
    }
  | {
      ok: false;
      error: string;
    };

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function getCartProgramSlug(item: CartItem): DietSlug | null {
  const slug = normalizeText(item.programSlug);
  if (
    slug === 'weight-loss' ||
    slug === 'mass-gain' ||
    slug === 'pregnancy' ||
    slug === 'pcos-pcod' ||
    slug === 'diabetes' ||
    slug === 'kids'
  ) {
    return slug;
  }

  return null;
}

function findPlanForCartItem(plans: DietPlan[], item: CartItem) {
  const id = normalizeText(item.id);
  const name = normalizeText(item.name).toLowerCase();

  return plans.find((plan) => {
    const planName = plan.name.toLowerCase();
    return id === plan.id || id.startsWith(`${plan.id}-`) || name.includes(planName);
  });
}

function getRequiredMealSlots(plan: DietPlan, item: CartItem) {
  if (plan.customPrices) return normalizeMealSlots(item.mealSlots).length;
  return Math.min(3, Math.max(1, plan.mealsPerDay || 1));
}

function getTrustedPlanPrice(plan: DietPlan, item: CartItem) {
  if (!plan.customPrices) return plan.price;
  const slots = normalizeMealSlots(item.mealSlots);
  return slots.reduce((sum, slot) => sum + (plan.customPrices?.[slot] ?? 0), 0);
}

function findSampleForCartItem(samples: DietMeal[], item: CartItem) {
  const id = normalizeText(item.id);
  const name = normalizeText(item.name).toLowerCase();

  return samples.find((sample) => {
    return id === sample.id || id.endsWith(`-${sample.id}`) || name.includes(sample.name.toLowerCase());
  });
}

function normalizeTrustedItem(item: CartItem, price: number, name?: string, mealSlots?: CartItem['mealSlots'], mealsPerDay?: number): CartItem {
  return {
    ...item,
    name: name ?? item.name,
    mealsPerDay,
    mealSlots,
    basePrice: price,
    quantity: 1,
    addOns: [],
    removedIngredients: Array.isArray(item.removedIngredients) ? item.removedIngredients : [],
    totalPrice: price,
  };
}

export async function getTrustedCheckoutPricing(items: CartItem[]): Promise<TrustedCheckoutPricing> {
  if (items.length !== 1 || items.some((item) => item.quantity !== 1)) {
    return {
      ok: false,
      error: 'Please order one item at a time. Free samples and meal plans must be ordered separately.',
    };
  }

  const item = items[0];
  const slug = getCartProgramSlug(item);
  if (!slug) {
    return { ok: false, error: 'Select a valid Project Fit program before checkout.' };
  }

  const diet = await getDietWithPlanOverrides(slug);
  if (!diet) {
    return { ok: false, error: 'Selected program is not available.' };
  }

  if (item.itemType === 'free_sample') {
    const sample = findSampleForCartItem(diet.freeSamples ?? [], item);
    if (!sample) {
      return { ok: false, error: 'Selected free sample is not available.' };
    }

    return {
      ok: true,
      items: [normalizeTrustedItem(item, 0, `${diet.title} - Free Sample: ${sample.name}`)],
      subtotal: 0,
      tax: 0,
      total: 0,
      orderType: 'free_sample',
    };
  }

  const plan = findPlanForCartItem(diet.plans, item);
  if (!plan) {
    return { ok: false, error: 'Selected meal plan is not available.' };
  }

  const requiredMealSlots = getRequiredMealSlots(plan, item);

  if (plan.customPrices && (requiredMealSlots < 1 || requiredMealSlots > 2)) {
    return { ok: false, error: `Select 1 or 2 meal times for ${plan.name}.` };
  }

  const mealSlots = requiredMealSlots >= 3
    ? getDefaultMealSlots(requiredMealSlots)
    : normalizeMealSlots(item.mealSlots);

  if (mealSlots.length !== requiredMealSlots) {
    return {
      ok: false,
      error: `Select exactly ${requiredMealSlots} meal ${requiredMealSlots === 1 ? 'slot' : 'slots'} before checkout.`,
    };
  }

  const price = getTrustedPlanPrice(plan, item);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'Selected meal plan price is invalid.' };
  }

  const name = plan.customPrices
    ? `${diet.title} - ${plan.name} (${formatMealSlots(mealSlots)})`
    : `${diet.title} - ${plan.name}`;
  const subtotal = Math.round(price);
  const tax = Math.round(subtotal * 0.05);

  return {
    ok: true,
    items: [normalizeTrustedItem(item, subtotal, name, mealSlots, requiredMealSlots)],
    subtotal,
    tax,
    total: subtotal + tax,
    orderType: 'paid_plan',
  };
}
