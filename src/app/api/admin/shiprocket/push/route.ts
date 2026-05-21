/**
 * POST /api/admin/shiprocket/push
 * Manually push an order to Shiprocket.
 * Used for: retries, orders placed before Shiprocket was configured,
 * or any order where automated push failed.
 *
 * Body: { order_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin }               from '@/lib/adminAuth';
import { createShiprocketOrder }      from '@/lib/shiprocket';
import { writeAuditLog }             from '@/lib/auditLog';

type OrderRow = {
  id: string;
  total: number;
  shipping_address: unknown;
  payment_method: string;
  shiprocket_order_id: string | null;
};

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: { order_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { order_id } = body;
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  // Cast to any so the untyped client doesn't resolve .from() as never
  
  const supabase = createAdmin() as any;

  // Fetch full order
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, total, shipping_address, payment_method, shiprocket_order_id')
    .eq('id', order_id)
    .single() as { data: OrderRow | null; error: unknown };

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Fetch order items
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity, price')
    .eq('order_id', order_id);

  if (!items?.length) {
    return NextResponse.json({ error: 'Order has no items' }, { status: 400 });
  }

  try {
    const sr = await createShiprocketOrder({
      order_id:         order.id,
      order_date:       new Date().toISOString(),
      shipping_address: order.shipping_address as any,
      items,
      total:            order.total,
      payment_method:   order.payment_method === 'cod' ? 'cod' : 'prepaid',
    });

    // Persist Shiprocket IDs
    await supabase
      .from('orders')
      .update({
        shiprocket_order_id:    sr.order_id,
        shiprocket_shipment_id: sr.shipment_id,
      })
      .eq('id', order_id);

    await writeAuditLog({
      action:      'shiprocket.manual_push',
      admin_email: req.headers.get('x-admin-email') ?? undefined,
      resource_id: `order:${order_id}`,
      meta:        { shiprocket_order_id: sr.order_id },
    });

    return NextResponse.json({ ok: true, shiprocket_order_id: sr.order_id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}