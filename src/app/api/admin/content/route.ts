import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient()
    .from('site_settings').select('key, value').in('key', ['hero_slides', 'announcements']);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result: Record<string, unknown> = {};
  const rows = (data ?? []) as Array<{ key: string; value: string }>;
  for (const row of rows) {
    try { result[row.key] = JSON.parse(row.value); } catch {}
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
  const { error } = await createAdminClient()
    .from('site_settings')
    .upsert({ key, value: JSON.stringify(value) } as any, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
