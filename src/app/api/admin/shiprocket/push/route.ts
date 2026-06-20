/**
 * POST /api/admin/shiprocket/push
 *
 * ⚠️  SHIPROCKET PAUSED
 * Returns 503 while SHIPROCKET_PAUSED !== 'false'.
 * Admin is handling all orders manually.
 *
 * To re-enable: set SHIPROCKET_PAUSED=false in .env and redeploy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin }               from '@/lib/adminAuth';
import { createShiprocketOrder }      from '@/lib/shiprocket';
import { writeAuditLog }              from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  // ── Pause guard ──────────────────────────────────────────────────────────
  if (process.env.SHIPROCKET_PAUSED !== 'false') {
    return NextResponse.json(
      {
        error:  'Shiprocket is currently paused. Orders are being handled manually by the admin.',
        paused: true,
      },
      { status: 503 }
    );
  }

  let body: { order_id?: string; orderId?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Accept both camelCase (from admin UI) and snake_case
  const order_id = body.order_id ?? body.orderId;
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const supabase = createAdmin() as any;

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, total, shipping_address, payment_method, shiprocket_order_id')
    .eq('id', order_id)
    .single() as { data: { id: string; total: number; shipping_address: unknown; payment_method: string; shiprocket_order_id: number | null } | null; error: unknown };

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Guard against duplicate pushes (unless admin explicitly forces)
  if (order.shiprocket_order_id && !body.force) {
    return NextResponse.json(
      {
        error: `Order already pushed to Shiprocket (SR ID: ${order.shiprocket_order_id}). ` +
               'Pass { force: true } to re-push anyway.',
        shiprocket_order_id: order.shiprocket_order_id,
      },
      { status: 409 }
    );
  }

  // Fetch items WITH product names via variants→products join
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity, price, variants(products(name))')
    .eq('order_id', order_id);

  if (itemsErr || !items?.length) {
    return NextResponse.json({ error: 'Order has no items' }, { status: 400 });
  }

  const enrichedItems = items.map((i: any) => ({
    product_id:   i.product_id,
    variant_id:   i.variant_id,
    quantity:     i.quantity,
    price:        i.price,
    product_name: i.variants?.products?.name ?? i.variant_id,
  }));

  try {
    const sr = await createShiprocketOrder({
      order_id:         order.id,
      order_date:       new Date().toISOString(),
      shipping_address: order.shipping_address as any,
      items:            enrichedItems,
      total:            order.total,
      payment_method:   order.payment_method === 'cod' ? 'cod' : 'prepaid',
    });

    const updatePayload: Record<string, any> = {
      shiprocket_order_id:    sr.order_id,
      shiprocket_shipment_id: sr.shipment_id,
    };
    if (sr.awb_code) {
      updatePayload.awb_code        = sr.awb_code;
      updatePayload.tracking_number = sr.awb_code;
    }
    if (sr.courier) {
      updatePayload.courier = sr.courier;
    }

    await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id);

    await writeAuditLog({
      action:      'shiprocket.manual_push',
      admin_email: req.headers.get('x-admin-email') ?? undefined,
      resource_id: `order:${order_id}`,
      meta:        { shiprocket_order_id: sr.order_id, forced: !!body.force },
    });

    return NextResponse.json({
      ok:                  true,
      shiprocket_order_id: sr.order_id,
      awb_code:            sr.awb_code   ?? null,
      courier_name:        sr.courier    ?? null,
    });
  } catch (e: any) {
    console.error('[admin/shiprocket/push] Shiprocket API error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
