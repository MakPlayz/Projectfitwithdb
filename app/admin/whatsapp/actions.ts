'use server';

import { revalidatePath } from 'next/cache';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MealPlan, MenuItem, ProjectFitUser } from '@/lib/backend-types';
import { sendAdminWhatsAppText, sendWelcomeTemplate } from '@/lib/whatsapp';

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

function getPrice() {
  return 0;
}

export async function saveMenuItem(formData: FormData) {
  requireAdmin(formData);

  const id = getText(formData, 'id');
  const payload = {
    name: getText(formData, 'name'),
    description: getText(formData, 'description') || null,
    price: getPrice(),
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
    price: getPrice(),
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

export async function sendWhatsAppAdminMessage(formData: FormData) {
  requireAdmin(formData);

  const mode = getText(formData, 'mode');
  const userId = getText(formData, 'userId');
  const phone = getText(formData, 'phone');
  const message = getText(formData, 'message');

  if (mode === 'welcome-template') {
    if (!userId) {
      throw new Error('Select a user before sending the welcome template.');
    }

    const result = await supabaseRestFetch<ProjectFitUser[]>(
      `/users?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
    );
    const user = result.data?.[0] ?? null;

    if (result.error) {
      throw new Error(result.error);
    }

    if (!user) {
      throw new Error('User not found.');
    }

    await sendWelcomeTemplate(user);
    revalidatePath('/admin/whatsapp');
    return;
  }

  if (mode === 'custom-text') {
    if (!phone || !message) {
      throw new Error('Phone and message are required for a custom text.');
    }

    await sendAdminWhatsAppText(phone, message);
    revalidatePath('/admin/whatsapp');
    return;
  }

  throw new Error('Choose a valid WhatsApp send mode.');
}
