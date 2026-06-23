import type { CartItem, MealSlot } from '@/store/cartStore';

export const mealSlotOptions: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

const mealSlotIds = new Set<MealSlot>(mealSlotOptions.map((slot) => slot.id));

export function normalizeMealSlots(value: unknown): MealSlot[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<MealSlot>();
  const slots: MealSlot[] = [];

  for (const item of value) {
    const slot = String(item).toLowerCase().trim() as MealSlot;
    if (!mealSlotIds.has(slot) || seen.has(slot)) continue;
    seen.add(slot);
    slots.push(slot);
  }

  return mealSlotOptions.map((option) => option.id).filter((slot) => seen.has(slot));
}

export function formatMealSlots(slots: unknown) {
  const normalized = normalizeMealSlots(slots);
  if (normalized.length === 0) return '';

  return normalized
    .map((slot) => mealSlotOptions.find((option) => option.id === slot)?.label ?? slot)
    .join(', ');
}

export function getMealSlotsLabel(item: Pick<CartItem, 'mealSlots'>) {
  const label = formatMealSlots(item.mealSlots);
  return label ? `Meal slots: ${label}` : '';
}

export function getDefaultMealSlots(count: number): MealSlot[] {
  if (count >= 3) return ['breakfast', 'lunch', 'dinner'];
  return [];
}
