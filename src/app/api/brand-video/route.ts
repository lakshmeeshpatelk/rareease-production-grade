import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';

const SETTINGS_KEY = 'brand_promo_video';

/**
 * Public endpoint — no auth required.
 * Returns { url: string | null } for the brand promo video.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    const url = data?.value ? JSON.parse(data.value as string) : null;
    return NextResponse.json({ url }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ url: null });
  }
}