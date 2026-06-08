/**
 * POST /api/payments/verify
 *
 * Called by the frontend immediately after the Razorpay checkout popup
 * closes with a successful payment.
 *
 * Razorpay sends three values to the frontend callback:
 *   razorpay_order_id   — Razorpay's order ID (order_XXXXXXXXXXXXXXXX)
 *   razorpay_payment_id — Razorpay's payment ID (pay_XXXXXXXXXXXXXXXX)
 *   razorpay_signature  — HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) hex
 *
 * We verify the signature server-side before trusting any status.
 * We also re-check our DB for idempotency (webhook may have already
 * processed the payment).
 *
 * Side-effects here are intentionally minimal — the authoritative
 * side-effects (inventory, Shiprocket, email) all live in /webhook.
 * This endpoint optimistically updates the order to 'paid' if the
 * signature is valid and the webhook hasn't run yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin }        from '@/lib/supabaseAdmin';
import { verifyRazorpayPaymentSignature }     from '@/lib/razorpay';

export const runtime = 'nodejs'; // needs crypto

export async function POST(req: NextRequest) {
  let body: {
    orderId?:            string;
    razorpayOrderId?:    string;
    razorpayPaymentId?:  string;
    razorpaySignature?:  string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = body;

  // 1. Presence check
  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { error: 'Missing required fields: orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature' },
      { status: 400 }
    );
  }

  // 2. Verify HMAC signature — the only trust gate
  try {
    verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  } catch (e: any) {
    console.error('[verify] Signature verification failed:', e.message);
    return NextResponse.json(
      { error: 'Payment signature verification failed. Do not retry — contact support.' },
      { status: 400 }
    );
  }

  const supabase = createAdmin();

  // 3. Look up our order
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, payment_status, razorpay_order_id')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // 4. Confirm the Razorpay order ID matches — prevents cross-order tampering
  if (order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
    console.error(
      `[verify] Razorpay order ID mismatch for order ${orderId}: ` +
      `expected ${order.razorpay_order_id}, got ${razorpayOrderId}`
    );
    return NextResponse.json(
      { error: 'Payment ID mismatch. Contact support.' },
      { status: 400 }
    );
  }

  // 5. Idempotency: already paid (webhook beat us here)
  if (order.payment_status === 'paid') {
    return NextResponse.json({ payment_status: 'paid', order_id: orderId });
  }

  // 6. Optimistic update: signature is valid, mark as paid
  //    Webhook is the authoritative handler; this just speeds up the UI.
  //    The `.eq('payment_status', 'pending')` guard makes this idempotent.
  await supabase
    .from('orders')
    .update({
      payment_status:     'paid',
      status:             'processing',
      razorpay_payment_id: razorpayPaymentId,
    })
    .eq('id', orderId)
    .eq('payment_status', 'pending');

  return NextResponse.json({ payment_status: 'paid', order_id: orderId });
}
