import { NextRequest, NextResponse } from 'next/server';
import { verifyCashfreeWebhook } from '@/lib/cashfree';
import { isShiprocketConfigured, pushOrderToShiprocket } from '@/lib/shiprocket';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { captureException, setRequestContext } from '@/lib/monitoring';

/**
 * POST /api/payments/webhook
 *
 * Cashfree fires this server-to-server for every payment event.
 * This is the authoritative post-payment handler:
 *   - marks the order paid
 *   - decrements inventory
 *   - increments coupon usage
 *   - sends confirmation email
 *   - inserts user notification
 *   - pushes shipment to Shiprocket (Prepaid)
 *
 * Idempotency: if payment_status is already 'paid' we return early.
 *
 * Cashfree webhook signature headers:
 *   x-webhook-signature  — HMAC-SHA256(timestamp + rawBody, SECRET)
 *   x-webhook-timestamp  — Unix timestamp string
 */
export async function POST(req: NextRequest) {
  await setRequestContext(req);

  try {
    const rawBody  = await req.text();
    const signature = req.headers.get('x-webhook-signature') ?? '';
    const timestamp = req.headers.get('x-webhook-timestamp') ?? '';

    // Verify signature — bail on tampered requests
    if (!verifyCashfreeWebhook(rawBody, signature, timestamp)) {
      console.warn('[webhook] Invalid Cashfree signature — rejecting');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      type: string;
      data?: {
        order?: {
          order_id?:    string;
          order_amount?: number;
        };
        payment?: {
          cf_payment_id?: number;
          payment_status?: string;
          payment_amount?: number;
        };
      };
    };

    const supabase = createAdminClient();

    // ── PAYMENT_SUCCESS ────────────────────────────────────────────────
    if (event.type === 'PAYMENT_SUCCESS') {
      const cfOrderId    = event.data?.order?.order_id;
      const cfPaymentId  = String(event.data?.payment?.cf_payment_id ?? '');

      if (!cfOrderId) return NextResponse.json({ received: true });

      // Fetch our order (Cashfree order_id == our internal orderId)
      const { data: existing } = await supabase
        .from('orders')
        .select('id, payment_status, payment_method, user_id, coupon_code, discount_amount, subtotal, shipping, total, shipping_address')
        .eq('id', cfOrderId)
        .single();

      if (!existing) return NextResponse.json({ received: true, skipped: 'order_not_found' });

      // Idempotency guard
      if (existing.payment_status === 'paid') {
        return NextResponse.json({ received: true, skipped: 'already_processed' });
      }

      const orderId = existing.id as string;

      // Mark paid
      await supabase
        .from('orders')
        .update({
          payment_status:      'paid',
          status:              'processing',
          cashfree_payment_id: cfPaymentId,
        })
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
            console.error(`[webhook] decrement_inventory failed for variant ${item.variant_id}:`, invErr);
            await captureException(invErr, { route: 'payments/webhook', orderId, variantId: item.variant_id });
          }
        }
      }

      // Increment coupon usage
      if (existing.coupon_code) {
        await supabase.rpc('increment_coupon_usage', { p_code: existing.coupon_code });
      }

      // Notification for signed-in users
      if (existing.user_id) {
        supabase.from('user_notifications').insert({
          user_id: existing.user_id,
          type:    'order',
          icon:    '✅',
          msg:     `Payment confirmed for #${orderId}. Total ₹${(existing.total as number).toLocaleString('en-IN')}.`,
        }).then(null, console.error);
      }

      // Push to Shiprocket for Prepaid orders — skipped in sandbox/test mode
      const isLiveMode = (process.env.CASHFREE_ENV ?? 'sandbox') === 'production';
      if (isShiprocketConfigured && isLiveMode && orderItems && orderItems.length > 0) {
        const addr = existing.shipping_address as Record<string, string>;
        // Fetch product names
        const productIds = [...new Set(orderItems.map(i => i.product_id as string))];
        const { data: products } = await supabase.from('products').select('id, name').in('id', productIds);
        const nameMap = Object.fromEntries((products ?? []).map(p => [p.id as string, p.name as string]));

        pushOrderToShiprocket(
          orderId, addr,
          orderItems.map(i => ({
            productId:   i.product_id as string,
            variantId:   i.variant_id as string,
            quantity:    i.quantity   as number,
            serverPrice: i.price      as number,
            productName: nameMap[i.product_id as string] ?? '—',
          })),
          existing.total as number,
          'Prepaid',
          supabase
        ).catch(err => captureException(err, { route: 'payments/webhook', orderId, stage: 'shiprocket' }));
      }

      // Confirmation email (non-blocking)
      if (orderItems && orderItems.length > 0) {
        const addr = existing.shipping_address as Record<string, string>;
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
          subtotal: existing.subtotal        as number,
          discount: existing.discount_amount as number,
          shipping: existing.shipping        as number,
          total:    existing.total           as number,
          method:  'online',
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
    }

    // ── PAYMENT_FAILED ─────────────────────────────────────────────────
    if (event.type === 'PAYMENT_FAILED') {
      const cfOrderId = event.data?.order?.order_id;
      if (cfOrderId) {
        await supabase
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('id', cfOrderId);
      }
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    await captureException(err, { route: 'payments/webhook' });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}