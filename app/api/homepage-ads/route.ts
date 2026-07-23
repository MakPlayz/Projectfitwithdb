import { NextResponse } from 'next/server';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import type { HomepageAd, HomepageAdSettings } from '@/lib/backend-types';

function isVisibleToday(ad: HomepageAd, today: string) {
  if (!ad.active) return false;
  if (ad.start_date && ad.start_date > today) return false;
  if (ad.end_date && ad.end_date < today) return false;
  return true;
}

// The ads board is a decorative promo carousel. If the backend is unavailable
// (error result *or* a thrown exception such as missing env vars), degrade to
// "no ads" (HTTP 200) instead of surfacing a 500 to every homepage visitor.
// The failure is still logged server-side so real outages stay observable.
export async function GET() {
  try {
    const [settingsResult, adsResult] = await Promise.all([
      supabaseRestFetch<HomepageAdSettings[]>('/homepage_ad_settings?id=eq.true&select=*&limit=1'),
      supabaseRestFetch<HomepageAd[]>('/homepage_ads?active=eq.true&select=*&order=priority.asc,created_at.desc'),
    ]);

    if (settingsResult.error || adsResult.error) {
      console.error('[homepage-ads] failed to load ads', {
        settingsError: settingsResult.error,
        adsError: adsResult.error,
      });
      return NextResponse.json({ enabled: false, ads: [] });
    }

    const enabled = settingsResult.data?.[0]?.enabled ?? false;
    const today = new Date().toISOString().slice(0, 10);
    const ads = enabled ? (adsResult.data ?? []).filter((ad) => isVisibleToday(ad, today)) : [];

    return NextResponse.json({ enabled, ads });
  } catch (error) {
    console.error('[homepage-ads] failed to load ads', error);
    return NextResponse.json({ enabled: false, ads: [] });
  }
}
