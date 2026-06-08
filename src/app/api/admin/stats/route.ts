import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const admin = createAdminClient();

  const [ordersRes, reviewsRes, exchangesRes, inventoryRes] = await Promise.all([
    admin.from('orders').select('id, total, payment_status, status, created_at'),
    admin.from('reviews').select('id, is_approved'),
    admin.from('exchange_requests').select('id, status'),
    admin.from('inventory').select('variant_id, quantity, variants(product_id, size, products(name))'),
  ]);

  const orders = ordersRes.data ?? [];
  const revenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total as number), 0);
  const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const shipped = orders.filter(o => o.status === 'shipped').length;

  const revenueByDay: Record<string, number> = {};
  orders.filter(o => o.payment_status === 'paid').forEach(o => {
    const day = (o.created_at as string).slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] ?? 0) + (o.total as number);
  });

  const lowStock = (inventoryRes.data ?? [])
    .filter(inv => (inv.quantity as number) <= 3).slice(0, 8)
    .map(inv => {
      const v = inv.variants as { size?: string; products?: { name?: string }; product_id?: string } | null;
      return { name: v?.products?.name ?? '—', size: v?.size ?? '—', qty: inv.quantity as number, productId: v?.product_id ?? '' };
    });

  return NextResponse.json({
    revenue, pending, shipped,
    totalOrders: orders.length,
    pendingReviews: (reviewsRes.data ?? []).filter(r => !r.is_approved).length,
    pendingExchanges: (exchangesRes.data ?? []).filter(e => e.status === 'pending').length,
    lowStock, revenueByDay,
  });
}
