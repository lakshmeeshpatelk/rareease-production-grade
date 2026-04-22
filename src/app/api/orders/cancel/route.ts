import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { isRateLimited, getIP, LIMITS } from '@/lib/rateLimit';
import { captureException } from '@/lib/monitoring';

/**
 * POST /api/orders/cancel
 * Body: { orderId: string }
 *
 * Rules:
 *  - Order must be in 'pending' or 'processing' status
 *  - If the order belongs to a logged-in user, the caller must be that user
 *  - Guest orders (user_id IS NULL) can only be cancelled by contacting support
 *
 * Inventory restoration:
 *  - COD orders: inventory was decremented when the order reached 'processing'
 *  - Online orders: inventory was decremented by the payment webhook when paid
 *  - We restore inventory whenever status is 'processing' (both paths decremented by then)
 */
export async function POST(req: NextRequest) {
  // Rate limiting — reuse the payments limit (10 per 10 min per IP)
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

    // Who is calling?
    let callerId: string | null = null;
    try {
      const serverClient = createServerClient();
      const { data: { user } } = await serverClient.auth.getUser();
      callerId = user?.id ?? null;
    } catch {
      // unauthenticated — will be rejected below if order has an owner
    }

    const supabase = createAdminClient();

    // Fetch the order — also grab status fields needed for inventory restoration
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, user_id, payment_method, payment_status')
      .eq('id', orderId.toUpperCase())
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only cancellable while pending or processing
    if (!['pending', 'processing'].includes(order.status as string)) {
      return NextResponse.json(
        { error: 'This order can no longer be cancelled. Please contact support@rareease.com.' },
        { status: 400 }
      );
    }

    // Auth check: order must belong to the caller
    if (!callerId) {
      return NextResponse.json({ error: 'Please sign in to cancel an order.' }, { status: 401 });
    }
    if (order.user_id !== callerId) {
      return NextResponse.json({ error: 'You are not authorised to cancel this order.' }, { status: 403 });
    }

    // ── Restore inventory ────────────────────────────────────────────────────
    // Inventory is decremented the moment an order reaches 'processing':
    //   COD  → decremented in payments/create right before status → processing
    //   Online → decremented in payments/webhook when Cashfree confirms payment
    // So 'processing' is the reliable signal that stock was taken.
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
            // Log but don't block the cancellation — leaving an order stuck
            // in a non-cancelled state is worse than a stock discrepancy.
            console.error('[orders/cancel] increment_inventory failed:', invErr);
            await captureException(invErr, {
              route: 'orders/cancel',
              orderId: order.id,
              variantId: item.variant_id,
            });
          }
        }
      }
    }

    // Cancel the order
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
