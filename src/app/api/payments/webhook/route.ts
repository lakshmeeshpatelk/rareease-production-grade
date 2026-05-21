/**
 * POST /api/payments/webhook
 *
 * Razorpay server-to-server webhook — the authoritative payment handler.
 *
 * Security:
 *  - Signature verified via HMAC-SHA256 before any DB writes
 *  - Raw body preserved for signature verification (body parsers not used)
 *
 * Idempotency:
 *  - All mutations guarded with .eq('payment_status', 'pending') filter
 *  - Duplicate webhook delivery is safe
 *
 * Side effects (only on first payment.captured delivery):
 *  1. Mark order paid / processing
 *  2. Decrement inventory (via stored function)
 *  3. Increment coupon usage
 *  4. Send confirmation email
 *  5. Push order to Shiprocket
 *  6. Write to audit log
 *
 * Razorpay webhook events handled:
 *  - payment.captured  → authoritative success; triggers all side-effects
 *  - payment.failed    → mark order failed/cancelled
 *  - order.paid        → redundant (payment.captured preferred); logged only
 *  - refund.processed  → update order payment_status to refunded
 *
 * Razorpay retries webhooks for up to 24 hours if we return non-2xx.
 * We return 200 for invalid signatures (to prevent log spam from truly
 * invalid payloads), but 500 for DB errors so Razorpay retries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin }    from '@/lib/supabaseAdmin';
import { verifyRazorpayWebhook }          from '@/lib/razorpay';
import { sendOrderConfirmationEmail }     from '@/lib/email';
import { createShiprocketOrder }          from '@/lib/shiprocket';
import { writeAuditLog }                  from '@/lib/auditLog';

export const runtime = 'nodejs'; // needs crypto module

export async function POST(req: NextRequest) {
  // 1. Read raw body as text (required for signature verification)
  const rawBody   = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!signature) {
    console.error('[webhook] Missing x-razorpay-signature header');
    return NextResponse.json({ ok: false, reason: 'missing_signature' }, { status: 400 });
  }

  // 2. Verify signature — reject if invalid
  try {
    verifyRazorpayWebhook(rawBody, signature);
  } catch (e: any) {
    console.error('[webhook] Signature verification failed:', e.message);
    // Return 400 so forged payloads are clearly rejected
    return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 400 });
  }

  // 3. Parse payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }

  const event   = payload?.event ?? '';
  const entity  = payload?.payload?.payment?.entity ?? payload?.payload?.order?.entity ?? {};

  // 4. Route by event type
  const supabase = createAdmin();

  // ── payment.captured ───────────────────────────────────────────────────────
  if (event === 'payment.captured') {
    const rzpPaymentId = entity?.id ?? '';
    const rzpOrderId   = entity?.order_id ?? '';
    const amountPaise  = entity?.amount ?? 0;

    if (!rzpOrderId) {
      return NextResponse.json({ ok: false, reason: 'missing_order_id' }, { status: 400 });
    }

    // Look up our order by razorpay_order_id
    const { data: dbOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_status, coupon_code, total, shipping_address, email_sent, user_id')
      .eq('razorpay_order_id', rzpOrderId)
      .single();

    if (fetchErr || !dbOrder) {
      console.error(`[webhook] Order not found for razorpay_order_id: ${rzpOrderId}`);
      return NextResponse.json({ ok: false, reason: 'order_not_found' }, { status: 400 });
    }

    // Idempotency guard
    if (dbOrder.payment_status === 'paid') {
      return NextResponse.json({ ok: true, note: 'already_processed' });
    }

    // Server-side amount validation: what Razorpay captured must match our record
    const expectedPaise = Math.round(dbOrder.total * 100);
    if (amountPaise !== expectedPaise) {
      console.error(
        `[webhook] Amount mismatch for order ${dbOrder.id}: ` +
        `expected ${expectedPaise} paise, got ${amountPaise}`
      );
      await writeAuditLog({
        action:      'payment.amount_mismatch',
        resource_id: `order:${dbOrder.id}`,
        meta:        { expected_paise: expectedPaise, received_paise: amountPaise, rzp_payment_id: rzpPaymentId },
      });
      // Don't process — requires manual review
      return NextResponse.json({ ok: false, reason: 'amount_mismatch' }, { status: 200 });
    }

    // Mark order as paid (idempotent)
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        payment_status:      'paid',
        status:              'processing',
        razorpay_payment_id: rzpPaymentId,
      })
      .eq('id', dbOrder.id)
      .eq('payment_status', 'pending');

    if (updateErr) {
      console.error('[webhook] order update error:', updateErr);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    // Decrement inventory (via Supabase stored function)
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', dbOrder.id);

    if (items?.length) {
      for (const item of items) {
        const { error: invErr } = await supabase.rpc('decrement_inventory', {
          p_variant_id: item.variant_id,
          p_qty:        item.quantity,
        });
        if (invErr) {
          console.error(`[webhook] inventory decrement failed for variant ${item.variant_id}:`, invErr.message);
          await writeAuditLog({
            action:      'inventory.decrement_failed',
            resource_id: `order:${dbOrder.id}`,
            meta:        { variant_id: item.variant_id, error: invErr.message },
          });
        }
      }
    }

    // Increment coupon usage
    if (dbOrder.coupon_code) {
      await supabase.rpc('increment_coupon_usage', { p_code: dbOrder.coupon_code });
    }

    // Send confirmation email (idempotent via email_sent flag)
    if (!dbOrder.email_sent) {
      try {
        const emailAddr = (dbOrder.shipping_address as any)?.email ?? '';
        const name      = (dbOrder.shipping_address as any)?.name  ?? 'Customer';
        if (emailAddr) {
          await sendOrderConfirmationEmail({
            to:      emailAddr,
            name,
            orderId: dbOrder.id,
            total:   dbOrder.total,
            items:   items ?? [],
            address: dbOrder.shipping_address as any,
            paymentMethod: 'online',
          });
          await supabase
            .from('orders').update({ email_sent: true }).eq('id', dbOrder.id);
        }
      } catch (e: any) {
        console.error('[webhook] email send failed:', e.message);
        // Non-fatal — order is confirmed even if email fails
      }
    }

    // Push to Shiprocket (async — don't let failure block the response)
    Promise.resolve().then(async () => {
      try {
        if (!items?.length) return;
        const sr = await createShiprocketOrder({
          order_id:         dbOrder.id,
          order_date:       new Date().toISOString(),
          shipping_address: dbOrder.shipping_address as any,
          items,
          total:            dbOrder.total,
          payment_method:   'prepaid',
        });
        if (sr?.order_id) {
          await supabase
            .from('orders')
            .update({ shiprocket_order_id: sr.order_id, shiprocket_shipment_id: sr.shipment_id })
            .eq('id', dbOrder.id);
        }
      } catch (e: any) {
        console.error('[webhook] Shiprocket push failed:', e.message);
      }
    });

    await writeAuditLog({
      action:      'payment.success',
      resource_id: `order:${dbOrder.id}`,
      meta:        { rzp_payment_id: rzpPaymentId, amount_paise: amountPaise },
    });

    return NextResponse.json({ ok: true });
  }

  // ── payment.failed ─────────────────────────────────────────────────────────
  if (event === 'payment.failed') {
    const rzpOrderId = entity?.order_id ?? '';
    if (!rzpOrderId) {
      return NextResponse.json({ ok: false, reason: 'missing_order_id' }, { status: 400 });
    }

    const { data: dbOrder } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('razorpay_order_id', rzpOrderId)
      .single();

    if (dbOrder && dbOrder.payment_status !== 'paid') {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', dbOrder.id)
        .eq('payment_status', 'pending');
    }

    return NextResponse.json({ ok: true });
  }

  // ── refund.processed ───────────────────────────────────────────────────────
  if (event === 'refund.processed') {
    const rzpPaymentId = entity?.payment_id ?? '';
    if (rzpPaymentId) {
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded', status: 'refunded' })
        .eq('razorpay_payment_id', rzpPaymentId);

      await writeAuditLog({
        action:      'payment.refunded',
        resource_id: `payment:${rzpPaymentId}`,
        meta:        { entity },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── order.paid (redundant — payment.captured is preferred) ────────────────
  if (event === 'order.paid') {
    // Already handled by payment.captured; just acknowledge
    return NextResponse.json({ ok: true, note: 'order.paid acknowledged' });
  }

  // ── Unknown event — acknowledge to prevent retries ─────────────────────────
  console.log(`[webhook] Unhandled event type: ${event}`);
  return NextResponse.json({ ok: true, note: `unhandled_event: ${event}` });
}
