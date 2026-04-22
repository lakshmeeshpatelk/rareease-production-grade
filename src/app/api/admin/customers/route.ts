import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, email, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customers = await Promise.all(
    (data ?? []).map(async p => {
      const { data: orders } = await admin
        .from('orders').select('total, payment_status, created_at, shipping_address')
        .eq('user_id', p.id).eq('payment_status', 'paid');
      const totalSpent = (orders ?? []).reduce((s, o) => s + (o.total as number), 0);
      const sorted = (orders ?? []).sort((a, b) =>
        new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
      const lastAddr = sorted[0]?.shipping_address as Record<string, string> | undefined;
      return {
        id: p.id,
        name: (p.full_name as string) ?? '—',
        email: (p.email as string) ?? '—',
        phone: (p.phone as string) ?? '—',
        city: lastAddr?.city ?? '—',
        orders: (orders ?? []).length,
        totalSpent,
        joined: new Date(p.created_at as string).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
        lastOrder: sorted[0]
          ? new Date(sorted[0].created_at as string).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
          : '—',
      };
    })
  );
  return NextResponse.json(customers);
}
