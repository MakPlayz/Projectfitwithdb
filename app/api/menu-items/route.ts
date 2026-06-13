import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { MenuItem } from '@/lib/backend-types';

export async function GET() {
  const result = await supabaseRestFetch<MenuItem[]>(
    '/menu_items?active=eq.true&is_free_sample=eq.false&select=*&order=program_slug.asc,category.asc,name.asc'
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    menuItems: result.data ?? [],
  });
}
