import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null; created_at: string };
type Order = { total: number | null; payment_status: string | null; created_at: string | null; shipping_address: unknown };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, email, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customers = await Promise.all(
    (data as Profile[] ?? []).map(async (p: Profile) => {
      const { data: orders } = await admin
        .from('orders').select('total, payment_status, created_at, shipping_address')
        .eq('user_id', p.id).eq('payment_status', 'paid');
      const rows = (orders as Order[] ?? []);
      const totalSpent = rows.reduce((s, o) => s + (o.total as number), 0);
      const sorted = rows.sort((a, b) =>
        new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
      const lastAddr = sorted[0]?.shipping_address as Record<string, string> | undefined;
      return {
        id: p.id,
        name: p.full_name ?? '-',
        email: p.email ?? '-',
        phone: p.phone ?? '-',
        city: lastAddr?.city ?? '-',
        orders: rows.length,
        totalSpent,
        joined: new Date(p.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
        lastOrder: sorted[0]
          ? new Date(sorted[0].created_at as string).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
          : '-',
      };
    })
  );
  return NextResponse.json(customers);
}