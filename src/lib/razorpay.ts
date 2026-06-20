/**
 * src/lib/razorpay.ts
 * Razorpay server-side helper
 */

import crypto from 'crypto';

const RZP_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayOrderInput {
  amount:   number;
  currency: 'INR';
  receipt:  string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id:         string;
  entity:     'order';
  amount:     number;
  currency:   string;
  receipt:    string;
  status:     'created' | 'attempted' | 'paid';
  attempts:   number;
  created_at: number;
}

export interface RazorpayPayment {
  id:          string;
  entity:      'payment';
  amount:      number;
  currency:    string;
  status:      'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id:    string;
  description: string;
  method:      string;
  captured:    boolean;
  error_code?:        string;
  error_description?: string;
  created_at:  number;
}

function authHeader(): HeadersInit {
  const keyId     = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  console.log('[razorpay:auth] keyId present:', !!keyId, '| keyId prefix:', keyId?.slice(0, 12));
  console.log('[razorpay:auth] keySecret present:', !!keySecret, '| keySecret length:', keySecret?.length);

  if (!keyId || !keySecret) {
    console.error('[razorpay:auth] MISSING CREDENTIALS — keyId:', keyId, 'keySecret:', !!keySecret);
    throw new Error(
      'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }

  const encoded = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return {
    Authorization:  `Basic ${encoded}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

export async function createRazorpayOrder(
  input: RazorpayOrderInput
): Promise<RazorpayOrderResponse> {
  console.log('[razorpay:createOrder] input:', JSON.stringify(input));

  const headers = authHeader();

  const res = await fetch(`${RZP_BASE}/orders`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(input),
  });

  const body = await res.json();

  console.log('[razorpay:createOrder] status:', res.status, '| body:', JSON.stringify(body));

  if (!res.ok) {
    const msg = body?.error?.description ?? body?.error?.code ?? 'Razorpay order creation failed';
    throw new Error(`[Razorpay] ${res.status}: ${msg}`);
  }

  return body as RazorpayOrderResponse;
}

export async function getRazorpayPayment(
  paymentId: string
): Promise<RazorpayPayment> {
  const res = await fetch(`${RZP_BASE}/payments/${paymentId}`, {
    method:  'GET',
    headers: authHeader(),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.error?.description ?? 'Failed to fetch payment';
    throw new Error(`[Razorpay] ${res.status}: ${msg}`);
  }

  return body as RazorpayPayment;
}

export async function getRazorpayOrderPayments(
  razorpayOrderId: string
): Promise<{ count: number; items: RazorpayPayment[] }> {
  const res = await fetch(`${RZP_BASE}/orders/${razorpayOrderId}/payments`, {
    method:  'GET',
    headers: authHeader(),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.error?.description ?? 'Failed to fetch order payments';
    throw new Error(`[Razorpay] ${res.status}: ${msg}`);
  }

  return body;
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId:   string,
  razorpayPaymentId: string,
  signature:         string,
): void {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET not configured for signature verification');
  }
  const signatureData = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(signatureData)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Razorpay payment signature mismatch');
  }
}

export function verifyRazorpayWebhook(
  rawBody:   string,
  signature: string,
): void {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET not configured for webhook verification');
  }
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Razorpay webhook signature mismatch');
  }
}

/**
 * Maps a Razorpay payment status to our internal payment status.
 *
 * FIX: 'authorized' now maps to 'pending', NOT 'paid'.
 *
 * 'authorized' means the payment is reserved but NOT yet settled.
 * Razorpay can reverse an authorized (but not captured) payment.
 * Only 'captured' payments are definitively collected.
 *
 * With auto-capture enabled in your Razorpay account (the default),
 * you will rarely see 'authorized' — payments go straight to 'captured'.
 * But this mapping must be semantically correct regardless.
 */
export function mapRazorpayStatus(
  status: string
): 'paid' | 'failed' | 'pending' {
  switch (status?.toLowerCase()) {
    case 'captured':
      return 'paid';
    case 'authorized':
      return 'pending'; // reserved but not yet settled — treat as pending
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) throw new Error('RAZORPAY_KEY_ID not configured');
  return keyId;
}