import { NextRequest, NextResponse } from 'next/server';
import { getCashfreeOrderStatus } from '@/lib/cashfree';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { captureException } from '@/lib/monitoring';

/**
 * POST /api/payments/verify
 *
 * Called by the Cashfree SDK after payment completes (via return_url redirect
 * OR direct JS SDK callback). Fetches order status from Cashfree server-to-server
 * to confirm payment, then returns current order state for the UI.
 *
 * Primary path: Cashfree webhook (/api/payments/webhook) handles all post-payment
 * work (inventory, coupon, email). This route is the safety net for when the
 * webhook is delayed or missed.
 *
 * Idempotency: payment_status 'paid' is the guard — all mutations are skipped
 * if the order is already marked paid.
 *
 * Also handles GET requests from Cashfree's return_url redirect.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    return await verifyOrder(orderId);
  } catch (err) {
    await captureException(err, { route: 'payments/verify' });
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Cashfree redirects here after payment with ?orderId=...
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.redirect(new URL('/?payment=failed', req.url));
  }

  try {
    const result = await verifyOrder(orderId);
    const data   = await result.json() as { paymentStatus?: string };

    if (data.paymentStatus === 'paid') {
      return NextResponse.redirect(new URL(`/?payment=success&orderId=${orderId}`, req.url));
    }
    return NextResponse.redirect(new URL(`/?payment=failed&orderId=${orderId}`, req.url));
  } catch {
    return NextResponse.redirect(new URL('/?payment=failed', req.url));
  }
}

async function verifyOrder(orderId: string): Promise<NextResponse> {
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const supabase = createAdminClient();

  interface OrderRow {
    id: string;
    cashfree_order_id: string | null;
    payment_status: string | null;
    status: string | null;
    total: number;
    subtotal: number;
    shipping: number;
    discount_amount: number;
    coupon_code: string | null;
    user_id: string | null;
    shipping_address: Record<string, string>;
    payment_method: string | null;
    email_sent: boolean | null;
  }

  // Fetch our order — grab full fields needed for fallback post-payment work
  const { data: orderRaw } = await supabase
    .from('orders')
    .select('id, cashfree_order_id, payment_status, status, total, subtotal, shipping, discount_amount, coupon_code, user_id, shipping_address, payment_method, email_sent')
    .eq('id', orderId)
    .single();

  const order = orderRaw as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Webhook already processed it — return immediately (idempotent)
  if (order.payment_status === 'paid') {
    return NextResponse.json({
      success:       true,
      paymentStatus: 'paid',
      orderStatus:   order.status,
    });
  }

  // Verify directly with Cashfree as a fallback
  if (order.cashfree_order_id) {
    try {
      const cfStatus = await getCashfreeOrderStatus(orderId);
      if (cfStatus.order_status === 'PAID') {
        // ── Webhook safety net ───────────────────────────────────────────────
        // The Cashfree webhook should have already handled everything, but it
        // can be delayed or fail. We alert Sentry so the team knows the webhook
        // is unreliable, then perform all post-payment work here idempotently.
        await captureException(
          new Error(`[verify] Webhook missed for order ${orderId} — running fallback post-payment work`),
          { route: 'payments/verify', orderId, severity: 'warning' }
        );

        // Mark paid + processing
        await supabase.from('orders')
          .update({ payment_status: 'paid', status: 'processing' })
          .eq('id', orderId);

        // Fetch order items
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('variant_id, quantity, product_id, price')
          .eq('order_id', orderId);

        // Decrement inventory
        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            const { error: invErr } = await supabase.rpc('decrement_inventory', {
              p_variant_id: item.variant_id,
              p_qty:        item.quantity,
            });
            if (invErr) {
              console.error(`[verify] decrement_inventory failed for variant ${item.variant_id}:`, invErr);
              await captureException(invErr, { route: 'payments/verify', orderId, variantId: item.variant_id });
            }
          }
        }

        // Increment coupon usage
        if (order.coupon_code) {
          await supabase.rpc('increment_coupon_usage', { p_code: order.coupon_code });
        }

        // User notification
        if (order.user_id) {
          supabase.from('user_notifications').insert({
            user_id: order.user_id,
            type:    'order',
            icon:    '✅',
            msg:     `Payment confirmed for #${orderId}. Total ₹${(order.total as number).toLocaleString('en-IN')}.`,
          }).then(null, console.error);
        }

        // Confirmation email (non-blocking, only if not already sent by webhook)
        if (!order.email_sent && orderItems && orderItems.length > 0) {
          const addr = order.shipping_address as Record<string, string>;
          const productIds = [...new Set(orderItems.map(i => i.product_id as string))];
          const { data: products } = await supabase.from('products').select('id, name').in('id', productIds);
          const nameMap = Object.fromEntries((products ?? []).map(p => [p.id as string, p.name as string]));
          const { data: variants } = await supabase.from('variants').select('id, size').in('id', orderItems.map(i => i.variant_id as string));
          const sizeMap = Object.fromEntries((variants ?? []).map(v => [v.id as string, v.size as string]));

          sendOrderConfirmationEmail({
            orderId,
            name:    addr.name    ?? '',
            email:   addr.email   ?? '',
            items:   orderItems.map(i => ({
              name:  nameMap[i.product_id as string] ?? '—',
              size:  sizeMap[i.variant_id as string] ?? '—',
              qty:   i.quantity as number,
              price: i.price    as number,
            })),
            subtotal: order.subtotal        as number,
            discount: order.discount_amount as number,
            shipping: order.shipping        as number,
            total:    order.total           as number,
            method:   'online',
            address: {
              line1:   addr.line1   ?? '',
              line2:   addr.line2,
              city:    addr.city    ?? '',
              state:   addr.state   ?? '',
              pincode: addr.pincode ?? '',
            },
          }).then(() => {
            supabase.from('orders').update({ email_sent: true }).eq('id', orderId).then(null, console.error);
          }).catch(console.error);
        }

        return NextResponse.json({
          success:       true,
          paymentStatus: 'paid',
          orderStatus:   'processing',
        });
      }
    } catch (cfErr) {
      // Non-fatal: fall through and return DB state
      console.error('[verify] Cashfree status check failed:', cfErr);
    }
  }

  return NextResponse.json({
    success:       false,
    paymentStatus: order.payment_status ?? 'pending',
    orderStatus:   order.status         ?? 'pending',
  });
}