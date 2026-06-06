'use server';

import { revalidatePath } from 'next/cache';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MealPlan, MenuItem } from '@/lib/backend-types';

function requireAdmin(formData: FormData) {
  const token = String(formData.get('adminToken') ?? '');
  const expected = process.env.WHATSAPP_ADMIN_TOKEN?.trim();

  if (!expected || token !== expected) {
    throw new Error('Invalid admin token.');
  }
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getPrice(formData: FormData) {
  const price = Number(getText(formData, 'price'));

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Enter a valid price.');
  }

  return Math.round(price);
}

export async function saveMenuItem(formData: FormData) {
  requireAdmin(formData);

  const id = getText(formData, 'id');
  const payload = {
    name: getText(formData, 'name'),
    description: getText(formData, 'description') || null,
    price: getPrice(formData),
    category: getText(formData, 'category'),
    active: formData.get('active') === 'on',
  };

  if (!payload.name || !payload.category) {
    throw new Error('Menu item name and category are required.');
  }

  const result = await supabaseRestFetch<MenuItem[]>(
    id ? `/menu_items?id=eq.${encodeURIComponent(id)}` : '/menu_items',
    {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  );

  if (result.error) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/whatsapp');
}

export async function saveMealPlan(formData: FormData) {
  requireAdmin(formData);

  const id = getText(formData, 'id');
  const payload = {
    name: getText(formData, 'name'),
    description: getText(formData, 'description') || null,
    price: getPrice(formData),
    duration: getText(formData, 'duration'),
    active: formData.get('active') === 'on',
  };

  if (!payload.name || !payload.duration) {
    throw new Error('Meal plan name and duration are required.');
  }

  const result = await supabaseRestFetch<MealPlan[]>(
    id ? `/meal_plans?id=eq.${encodeURIComponent(id)}` : '/meal_plans',
    {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  );

  if (result.error) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/whatsapp');
}
