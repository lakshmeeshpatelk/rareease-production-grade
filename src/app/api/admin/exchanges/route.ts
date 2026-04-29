import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient()
    .from('exchange_requests')
    .select(`
      *,
      order:orders(id, shipping_address)
    `)
    .order('requested_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten shipping_address into customer/email/phone fields
  const enriched = (data ?? []).map(r => {
    const addr = (r.order as { shipping_address?: Record<string, string> } | null)?.shipping_address ?? {};
    return {
      ...r,
      customer: addr.name   ?? '—',
      email:    addr.email  ?? '—',
      phone:    addr.phone  ?? '—',
      order: undefined, // remove raw join
    };
  });

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id, status, admin_note } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const update: Record<string, unknown> = { status };
  if (admin_note !== undefined) update.admin_note = admin_note;
  const { error } = await createAdminClient().from('exchange_requests').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
