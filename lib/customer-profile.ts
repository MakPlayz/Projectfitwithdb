import type {
  ActivityLevel,
  CustomerGoal,
  CustomerProfilePayload,
  DietPreference,
  GenderIdentity,
  HealthFocus,
} from '@/lib/backend-types';

export const GENDER_OPTIONS: Array<{ value: GenderIdentity; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'sedentary', label: 'Mostly seated / desk-based' },
  { value: 'lightly-active', label: 'Light daily movement' },
  { value: 'moderately-active', label: 'Regular workouts or active job' },
  { value: 'very-active', label: 'Intense training or very active lifestyle' },
];

export const GOAL_OPTIONS: Array<{ value: CustomerGoal; label: string }> = [
  { value: 'weight-loss', label: 'Weight loss' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'muscle-gain', label: 'Muscle gain / bulking' },
  { value: 'better-fitness', label: 'General fitness & performance' },
];

export const HEALTH_FOCUS_OPTIONS: Array<{ value: HealthFocus; label: string }> = [
  { value: 'general', label: 'General wellness' },
  { value: 'pregnancy', label: 'Pregnancy nutrition' },
  { value: 'pcos-pcod', label: 'PCOS / PCOD support' },
  { value: 'diabetes', label: 'Diabetes-friendly plan' },
];

export const DIET_PREFERENCE_OPTIONS: Array<{ value: DietPreference; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non-vegetarian', label: 'Non-vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

export function getRecommendedPath(profile: CustomerProfilePayload) {
  if (profile.health_focus === 'pregnancy') return 'pregnancy';
  if (profile.health_focus === 'pcos-pcod') return 'pcos-pcod';
  if (profile.health_focus === 'diabetes') return 'diabetes';
  if (profile.primary_goal === 'muscle-gain') return 'mass-gain';
  if (profile.primary_goal === 'weight-loss') return 'weight-loss';
  return 'menu';
}

export function buildCoachNotes(profile: CustomerProfilePayload) {
  const notes: string[] = [];

  if (profile.primary_goal === 'weight-loss') {
    notes.push('Prioritize high-satiety meals with steady protein across the day.');
  }

  if (profile.primary_goal === 'muscle-gain') {
    notes.push('Build around calorie-dense meals with protein and carbs in each feeding window.');
  }

  if (profile.activity_level === 'sedentary') {
    notes.push('Keep energy intake controlled and emphasize fiber, hydration, and consistent movement breaks.');
  }

  if (profile.activity_level === 'very-active') {
    notes.push('Support training recovery with higher protein intake and better meal timing around workouts.');
  }

  if (profile.health_focus === 'diabetes') {
    notes.push('Favor low-GI carb choices and balanced plates to reduce glucose spikes.');
  }

  if (profile.health_focus === 'pcos-pcod') {
    notes.push('Use higher-fiber meals and steady protein to support insulin sensitivity and appetite control.');
  }

  if (profile.health_focus === 'pregnancy') {
    notes.push('Focus on consistent nourishment, iron-rich meals, calcium, hydration, and gentle digestion support.');
  }

  if (profile.diet_preference === 'vegan' || profile.diet_preference === 'vegetarian') {
    notes.push('Track protein quality carefully with legumes, soy, dairy alternatives, and smart add-ons.');
  }

  return notes.slice(0, 3);
}

export function buildRecommendationSummary(profile: CustomerProfilePayload) {
  const path = getRecommendedPath(profile);

  const goalCopy =
    profile.primary_goal === 'muscle-gain'
      ? 'support muscle gain'
      : profile.primary_goal === 'weight-loss'
        ? 'support fat loss'
        : profile.primary_goal === 'maintenance'
          ? 'maintain weight with consistent energy'
          : 'improve fitness and day-to-day performance';

  const pathCopy =
    path === 'mass-gain'
      ? 'mass-gain meals'
      : path === 'weight-loss'
        ? 'weight-loss meals'
        : path === 'pregnancy'
          ? 'pregnancy-safe nourishment'
          : path === 'pcos-pcod'
            ? 'PCOS-friendly meals'
            : path === 'diabetes'
              ? 'diabetes-friendly meals'
              : 'balanced menu options';

  return `Recommended focus: ${pathCopy} designed to ${goalCopy}, with ${profile.diet_preference.replace('-', ' ')} choices matched to a ${profile.activity_level.replace('-', ' ')} lifestyle.`;
}

export function normalizeCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
