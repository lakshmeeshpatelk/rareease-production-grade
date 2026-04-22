import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { logAdminAction } from '@/lib/auditLog';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select(`id, status, payment_status, payment_method, subtotal, total, shipping_address,
      tracking_number, courier, notes, created_at,
      items:order_items(quantity, price, product:products(name), variant:variants(size))`)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map(o => {
    const addr = o.shipping_address as Record<string, string>;
    return {
      id: o.id, status: o.status,
      payment: o.payment_status,
      paymentMethod: (o.payment_method as string) === 'cod' ? 'COD' : 'Online',
      customer: addr?.name ?? '—', email: addr?.email ?? '—',
      phone: addr?.phone ?? '—', city: addr?.city ?? '—',
      address: [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode].filter(Boolean).join(', '),
      items: ((o.items as Record<string, unknown>[]) ?? []).map(item => ({
        name: (item.product as { name?: string })?.name ?? '—',
        size: (item.variant as { size?: string })?.size ?? '—',
        qty: item.quantity as number, price: item.price as number,
      })),
      subtotal: o.subtotal, total: o.total, createdAt: o.created_at,
      trackingNumber: o.tracking_number, courier: o.courier, notes: o.notes,
    };
  });
  return NextResponse.json(orders);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id, status, tracking_number, courier, notes } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const update: Record<string, unknown> = { status };
  if (tracking_number !== undefined) update.tracking_number = tracking_number;
  if (courier !== undefined) update.courier = courier;
  if (notes !== undefined) update.notes = notes;
  const { error } = await createAdminClient().from('orders').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  logAdminAction('order.status_update', { resourceId: `order:${id}`, meta: update, req });
  return NextResponse.json({ ok: true });
}
