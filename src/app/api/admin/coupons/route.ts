import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient().from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const coupon = await req.json();
  if (!coupon?.code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  const { error } = await createAdminClient()
    .from('coupons')
    .upsert({ ...coupon, code: (coupon.code as string).toUpperCase() }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await createAdminClient().from('coupons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
