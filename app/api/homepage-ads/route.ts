import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { HomepageAd, HomepageAdSettings } from '@/lib/backend-types';

function isVisibleToday(ad: HomepageAd, today: string) {
  if (!ad.active) return false;
  if (ad.start_date && ad.start_date > today) return false;
  if (ad.end_date && ad.end_date < today) return false;
  return true;
}

export async function GET() {
  const [settingsResult, adsResult] = await Promise.all([
    supabaseRestFetch<HomepageAdSettings[]>('/homepage_ad_settings?id=eq.true&select=*&limit=1'),
    supabaseRestFetch<HomepageAd[]>('/homepage_ads?active=eq.true&select=*&order=priority.asc,created_at.desc'),
  ]);

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error }, { status: settingsResult.status });
  }

  if (adsResult.error) {
    return NextResponse.json({ error: adsResult.error }, { status: adsResult.status });
  }

  const enabled = settingsResult.data?.[0]?.enabled ?? false;
  const today = new Date().toISOString().slice(0, 10);
  const ads = enabled ? (adsResult.data ?? []).filter((ad) => isVisibleToday(ad, today)) : [];

  return NextResponse.json({ enabled, ads });
}
