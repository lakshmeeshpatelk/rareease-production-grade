import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient()
    .from('site_settings').select('key, value').in('key', ['hero_slides', 'announcements']);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    try { result[row.key as string] = JSON.parse(row.value as string); } catch {}
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
  const { error } = await createAdminClient()
    .from('site_settings')
    .upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
