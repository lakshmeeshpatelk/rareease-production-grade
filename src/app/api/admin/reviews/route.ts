import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient()
    .from('reviews')
    .select('id, product_id, reviewer_name, rating, body, is_verified_purchase, is_approved, created_at, products(name)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(r => ({
    id: r.id, productId: r.product_id,
    productName: (r.products as { name?: string } | null)?.name ?? '—',
    customer: (r.reviewer_name as string) ?? 'Anonymous',
    rating: r.rating, body: r.body,
    approved: r.is_approved, verified: r.is_verified_purchase,
    createdAt: (r.created_at as string).slice(0, 10),
  })));
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id, approved } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await createAdminClient().from('reviews').update({ is_approved: approved }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await createAdminClient().from('reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
