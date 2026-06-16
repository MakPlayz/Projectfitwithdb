export type DietSlug =
  | 'weight-loss'
  | 'mass-gain'
  | 'pregnancy'
  | 'pcos-pcod'
  | 'diabetes'
  | 'kids';

export interface DietPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  mealsPerDay: number;
  highlight: string;
  customPrices?: Record<number, number>;
}

export interface DietMeal {
  id: string;
  name: string;
  description: string;
  image: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'juice';
}

export interface DietCategory {
  slug: DietSlug;
  href: string;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  calorieTarget: string;
  pdfUrl: string;
  image: string;
  accent: string;
  accentLight: string;
  gradient: string;
  icon: string;
  plans: DietPlan[];
  meals: DietMeal[];
  freeSamples?: DietMeal[];
  macros: { label: string; value: string; note: string }[];
  nutritionHighlights: string[];
}

/** Category card & hero images */
export const categoryImages = {
  'weight-loss': '/images/categories/weightloss.png',
  'mass-gain': '/images/categories/mass-gain.png',
  pregnancy: '/images/categories/pregnancy.png',
  'pcos-pcod': '/images/categories/pcod.png',
  diabetes: '/images/categories/diabetes.png',
  kids: '/images/categories/kids.png',
} as const;

const pregnancyImages = {
  omelete: '/images/preg/omelete.png',
  abc: '/images/preg/abc.png',
  fishBowl: '/images/preg/fish-bowl.png',
  chiaPudding: '/images/preg/chia-pudding.png',
  poha: '/images/preg/poha.png',
} as const;

const weightLossImages = {
  oats: '/images/weightloss/oats.png',
  dal: '/images/weightloss/dal.png',
  flax: '/images/weightloss/flax.png',
  moong: '/images/weightloss/moong.png',
  abc: '/images/weightloss/abc.png',
} as const;

const massGainImages = {
  chocOats: '/images/mg/choc-oats.png',
  chickBowl: '/images/mg/chick-bowl.png',
  omelete: '/images/mg/omelete.png',
  sandwich: '/images/mg/sandwich.png',
  pineapple: '/images/mg/pineapple.png',
} as const;

export const dietCategories: DietCategory[] = [
  {
    slug: 'weight-loss',
    href: '/weight-loss',
    title: 'Weight Loss',
    shortTitle: 'Weight Loss',
    tagline: '6-day Indian plan · 1,400–1,600 kcal/day',
    description:
      'A structured 6-day Indian weight loss diet targeting 1,400–1,600 kcal per day with high protein, low-GI carbs, minimal oil, and portion control. Includes daily morning juices, balanced breakfast, lunch, and light dinners.',
    calorieTarget: '1,400–1,600 kcal/day',
    pdfUrl: '/pdfs/weight-loss.pdf',
    image: weightLossImages.oats,
    accent: '#059669',
    accentLight: '#ecfdf5',
    gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ffffff 100%)',
    icon: 'scale',
    plans: [
      {
        id: 'wl-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Single day plan',
      },
      {
        id: 'wl-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Superfood single day',
      },
      {
        id: 'wl-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Standard Clean Meals',
      },
      {
        id: 'wl-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Superfood Loaded',
      },
      {
        id: 'wl-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: '10% Deficit savings',
      },
      {
        id: 'wl-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Superfood monthly block',
      },
      {
        id: 'wl-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'wl-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Daily Calories', value: '1,400–1,600', note: 'Calorie deficit' },
      { label: 'Protein', value: 'High', note: 'Preserve muscle' },
      { label: 'Carbs', value: 'Low–moderate', note: 'Brown rice, millets, quinoa' },
    ],
    nutritionHighlights: [
      'High protein',
      'Low sugar — no sugary drinks or desserts',
      'Moderate complex carbs only',
      'Half plate non-starchy vegetables',
      '2–3 L water daily',
      'No fried snacks or bakery items',
    ],
  },
  {
    slug: 'mass-gain',
    href: '/mass-gain',
    title: 'Mass Gain',
    shortTitle: 'Mass Gain',
    tagline: '6-day mass gain · 2,500–2,800 kcal/day',
    description:
      'A 6-day mass gain meal plan targeting 2,500-2,800 kcal per day for gradual, sustainable weight gain. Balanced meals with protein at every meal, healthy fats, and complex carbs in rice or quinoa bowls.',
    calorieTarget: '2,500–2,800 kcal/day',
    pdfUrl: '/pdfs/mass-gain.pdf',
    image: massGainImages.chocOats,
    accent: '#ea580c',
    accentLight: '#fff7ed',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #ffffff 100%)',
    icon: 'dumbbell',
    plans: [
      {
        id: 'mg-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'High calorie day test',
      },
      {
        id: 'mg-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Whey & premium proteins',
      },
      {
        id: 'mg-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Standard High Calorie',
      },
      {
        id: 'mg-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Superfoods & Shakes',
      },
      {
        id: 'mg-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Massive bulking savings',
      },
      {
        id: 'mg-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Elite premium mass block',
      },
      {
        id: 'mg-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'mg-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Daily Calories', value: '2,500–2,800', note: 'Caloric surplus' },
      { label: 'Protein', value: 'Every meal', note: 'Muscle synthesis' },
      { label: 'Carbs', value: 'High', note: 'Rice & quinoa bowls' },
    ],
    nutritionHighlights: [
      '3 meals per day',
      'Protein with every meal',
      'Healthy fats — nuts, ghee, whole milk',
      'Do not skip rice/quinoa at dinner',
      'Strength training recommended',
      'Whey protein mid-morning snacks',
    ],
  },
  {
    slug: 'pregnancy',
    href: '/pregnancy',
    title: 'Pregnancy Nutrition',
    shortTitle: 'Pregnancy',
    tagline: '6-day pregnancy plan · Balanced & GD-safe',
    description:
      'A 6-day pregnancy meal plan focused on iron, calcium, protein, folic acid, and hydration. Uses complex carbs (quinoa, brown rice, oats) to help prevent gestational diabetes, with omega-3s via chia, walnuts, avocado, and low-mercury fish.',
    calorieTarget: 'Trimester-adjusted portions',
    pdfUrl: '/pdfs/pregnancy.pdf',
    image: pregnancyImages.omelete,
    accent: '#e11d48',
    accentLight: '#fff1f2',
    gradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #ffffff 100%)',
    icon: 'heart',
    plans: [
      {
        id: 'pr-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Pregnancy day test',
      },
      {
        id: 'pr-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Omega-3 day upgrade',
      },
      {
        id: 'pr-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Folate & Iron Essentials',
      },
      {
        id: 'pr-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Omega-3 Superfood Upgrade',
      },
      {
        id: 'pr-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Care & comfort savings',
      },
      {
        id: 'pr-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Full premium care block',
      },
      {
        id: 'pr-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'pr-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Key Nutrients', value: 'Iron · Calcium · Folate', note: 'Daily targets' },
      { label: 'Protein', value: 'Lean sources', note: 'Paneer, eggs, dal, fish' },
      { label: 'Carbs', value: 'Complex only', note: 'GD prevention' },
    ],
    nutritionHighlights: [
      'Iron, calcium, protein, folic acid',
      'Vitamin C juices boost iron absorption',
      'Omega-3 via chia, walnuts & fish',
      'Moderate complex carbs only',
      'Thoroughly cooked proteins',
      'Eat to satisfaction — no strict restriction',
    ],
  },
  {
    slug: 'pcos-pcod',
    href: '/pcos-pcod',
    title: 'PCOS / PCOD Diet',
    shortTitle: 'PCOS / PCOD',
    tagline: '6-day PCOD plan · Low GI · High fiber',
    description:
      'A 6-day PCOD/PCOS diet plan to stabilize insulin, reduce inflammation, and balance hormones. Low glycemic foods, strict avoidance of refined sugar and maida, high fiber and lean protein at every meal, plus chia and flax for healthy fats.',
    calorieTarget: 'Hormone-balancing portions',
    pdfUrl: '/pdfs/pcos-pcod.pdf',
    image: categoryImages['pcos-pcod'],
    accent: '#7c3aed',
    accentLight: '#f5f3ff',
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ffffff 100%)',
    icon: 'sparkles',
    plans: [
      {
        id: 'pc-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Hormone balance day test',
      },
      {
        id: 'pc-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Anti-inflammatory day',
      },
      {
        id: 'pc-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Low GI Control',
      },
      {
        id: 'pc-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Hormone Balance Superfoods',
      },
      {
        id: 'pc-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Stable hormones block',
      },
      {
        id: 'pc-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Elite hormone support block',
      },
      {
        id: 'pc-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'pc-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Glycemic Load', value: 'Low', note: 'Quinoa & brown rice' },
      { label: 'Fiber', value: 'High', note: 'Every meal' },
      { label: 'Avoid', value: 'Sugar & maida', note: 'Strict' },
    ],
    nutritionHighlights: [
      'Low glycemic complex carbs',
      'No refined sugar or maida',
      'Chia & flax for omega-3s',
      'Lighter dinners — more veggies, less rice',
      'Whole wheat/multigrain bread only',
      'Pair with daily exercise',
    ],
  },
  {
    slug: 'diabetes',
    href: '/diabetes',
    title: 'Diabetes-Friendly Diet',
    shortTitle: 'Diabetes',
    tagline: '6-day diabetes plan · Stable blood sugar',
    description:
      'A 6-day diabetes-friendly meal plan based on your personal menu rules. Eat every 3–4 hours, use quinoa or brown rice (never white rice or maida), high-fiber vegetables in every bowl, whole grain bread only, and strictly no white sugar.',
    calorieTarget: 'Stable glucose · Low GI',
    pdfUrl: '/pdfs/diabetes.pdf',
    image: categoryImages.diabetes,
    accent: '#0284c7',
    accentLight: '#f0f9ff',
    gradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%)',
    icon: 'activity',
    plans: [
      {
        id: 'db-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Diabetic day test',
      },
      {
        id: 'db-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Diabetic premium day',
      },
      {
        id: 'db-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Glucose Stability Focus',
      },
      {
        id: 'db-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Antioxidant Superfoods',
      },
      {
        id: 'db-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Glucose stability block',
      },
      {
        id: 'db-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Premium diabetic block',
      },
      {
        id: 'db-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'db-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Meal Timing', value: 'Every 3–4 hrs', note: 'Stable glucose' },
      { label: 'Carbs', value: 'Complex only', note: 'Quinoa & brown rice' },
      { label: 'Sugar', value: 'Zero white sugar', note: 'Strict rule' },
    ],
    nutritionHighlights: [
      'Eat every 3–4 hours',
      'Quinoa or brown rice — no white rice',
      'High-fiber vegetables in every bowl',
      'Whole wheat/multigrain bread only',
      'Green juice — diabetic & fatty liver friendly',
      'Lighter dinners — extra veggies, less rice',
    ],
  },
  {
    slug: 'kids',
    href: '/kids',
    title: 'Kids Section',
    shortTitle: 'Kids Section',
    tagline: '6-day kids plan · 1,200–1,500 kcal/day',
    description:
      'Highly nutritious, brain-boosting meals tailored specifically for kids. Prepared with premium proteins, healthy fats, dairy, and zero refined sugar, ensuring standard and upgraded tiers for balanced growth (6-day subscription).',
    calorieTarget: 'Child-optimized nutrition',
    pdfUrl: '/pdfs/kids.pdf',
    image: '/images/categories/kids.png',
    accent: '#d946ef',
    accentLight: '#fdf4ff',
    gradient: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #ffffff 100%)',
    icon: 'sparkles',
    plans: [
      {
        id: 'kd-day-reg',
        name: 'Day Regular Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Kids day test',
      },
      {
        id: 'kd-day-prem',
        name: 'Day Premium Plan',
        duration: '1 day',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Kids premium day',
      },
      {
        id: 'kd-6-reg',
        name: '6-Day Regular Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Standard Nutritious Meals',
      },
      {
        id: 'kd-6-prem',
        name: '6-Day Premium Plan',
        duration: '6 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Superfood & Smoothie Bowls',
      },
      {
        id: 'kd-month-reg',
        name: 'Monthly Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Healthy growth savings',
      },
      {
        id: 'kd-month-prem',
        name: 'Monthly Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 3,
        highlight: 'Vivid kids premium block',
      },
      {
        id: 'kd-custom-reg',
        name: 'Customized Regular Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Month plan required',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
      {
        id: 'kd-custom-prem',
        name: 'Customized Premium Plan',
        duration: '30 days',
        price: 0,
        mealsPerDay: 1,
        highlight: 'Premium custom meals',
        customPrices: {
          1: 0,
          2: 0,
        },
      },
    ],
    meals: [],
    macros: [
      { label: 'Growth Proteins', value: 'Optimized', note: 'Paneer, milk, dal' },
      { label: 'Calcium', value: 'High', note: 'Dairy & seeds' },
      { label: 'Vitamins', value: 'Essential', note: 'Fruits & veggies' },
    ],
    nutritionHighlights: [
      'Kid-approved healthy recipes',
      'High in protein & calcium for growth',
      'No artificial colors or preservatives',
      'Zero refined sugar or high-fructose syrups',
      'Balanced complex carbs for steady energy',
      'Includes superfood milkshakes and bowls',
    ],
  },
];

export function getDietBySlug(slug: string): DietCategory | undefined {
  return dietCategories.find((d) => d.slug === slug);
}

export const dietSlugs = dietCategories.map((d) => d.slug);
