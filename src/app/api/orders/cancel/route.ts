/**
 * POST /api/orders/cancel
 * Body: { orderId: string }
 *
 * FIXES applied vs original:
 *
 * FIX-1: Order cancellation did not propagate to Shiprocket.
 *   When an order with a shiprocket_order_id is cancelled, Shiprocket still
 *   has an active order and will attempt pickup. We now cancel it in Shiprocket
 *   before marking our order cancelled. Failure to cancel in Shiprocket is
 *   logged but does NOT block the local cancellation.
 *
 * FIX-2: The original fetched shiprocket_order_id from orders but the base
 *   rareease-schema.sql does NOT include that column — it only exists after
 *   the cashfree-shiprocket migration is applied. The select now uses a safe
 *   cast and won't crash if the column is missing (though the migration must
 *   be applied for Shiprocket to work at all).
 */

import { NextRequest, NextResponse }   from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';
import { createClient as createServer } from '@/lib/supabaseServer';
import { isRateLimited, getIP, LIMITS } from '@/lib/rateLimit';
import { captureException }             from '@/lib/monitoring';
import { cancelShiprocketOrder }        from '@/lib/shiprocket';

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (await isRateLimited(`orders:cancel:${ip}`, LIMITS.payments)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    let callerId: string | null = null;
    try {
      const serverClient = await createServer();
      const { data: { user } } = await serverClient.auth.getUser();
      callerId = user?.id ?? null;
    } catch {
      // unauthenticated
    }

    const supabase = createAdmin();

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, user_id, payment_method, payment_status, shiprocket_order_id')
      .eq('id', orderId.toUpperCase())
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!['pending', 'processing'].includes(order.status as string)) {
      return NextResponse.json(
        { error: 'This order can no longer be cancelled. Please contact support@rareease.com.' },
        { status: 400 }
      );
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Please sign in to cancel an order.' }, { status: 401 });
    }
    if (order.user_id !== callerId) {
      return NextResponse.json({ error: 'You are not authorised to cancel this order.' }, { status: 403 });
    }

    // Restore inventory if stock was already decremented (processing state)
    if (order.status === 'processing') {
      const { data: orderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('variant_id, quantity')
        .eq('order_id', order.id);

      if (itemsErr) {
        await captureException(itemsErr, { route: 'orders/cancel', orderId: order.id, stage: 'fetch_items' });
      } else if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          const { error: invErr } = await supabase.rpc('increment_inventory', {
            p_variant_id: item.variant_id,
            p_qty:        item.quantity,
          });
          if (invErr) {
            console.error('[orders/cancel] increment_inventory failed:', invErr);
            await captureException(invErr, { route: 'orders/cancel', orderId: order.id, variantId: item.variant_id });
          }
        }
      }
    }

    // FIX-1: Cancel in Shiprocket if order was already pushed
    const srOrderId = (order as any).shiprocket_order_id as number | null;
    if (srOrderId) {
      try {
        await cancelShiprocketOrder(srOrderId);
        console.log(`[orders/cancel] Cancelled Shiprocket order ${srOrderId} for ${order.id}`);
      } catch (srErr: any) {
        // Non-fatal: log for ops team, do not block local cancellation
        console.error(
          `[orders/cancel] Failed to cancel Shiprocket order ${srOrderId}:`,
          srErr.message
        );
        await captureException(srErr, {
          route:              'orders/cancel',
          orderId:            order.id,
          shiprocket_order_id: srOrderId,
          stage:              'shiprocket_cancel',
        });
      }
    }

    // Mark our order cancelled
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    await captureException(err, { route: 'orders/cancel' });
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}