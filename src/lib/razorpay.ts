/**
 * src/lib/razorpay.ts
 * Razorpay server-side helper
 *
 * Handles:
 *  - Order creation (returns razorpay order_id + amount for frontend)
 *  - Payment signature verification (HMAC-SHA256)
 *  - Webhook signature verification
 *  - Payment status fetch
 *
 * Uses Razorpay REST API directly — no SDK required at runtime.
 * Works in Node.js runtime on Vercel.
 */

import crypto from 'crypto';

// ─── Env validation ───────────────────────────────────────────────────────────

const KEY_ID     = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  console.warn('[razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set');
}

const RZP_BASE = 'https://api.razorpay.com/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RazorpayOrderInput {
  /** Amount in paise (rupees × 100) */
  amount:   number;
  currency: 'INR';
  /** Your internal order ID for idempotency */
  receipt:  string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id:         string;   // order_XXXXXXXXXXXXXXXX
  entity:     'order';
  amount:     number;   // paise
  currency:   string;
  receipt:    string;
  status:     'created' | 'attempted' | 'paid';
  attempts:   number;
  created_at: number;
}

export interface RazorpayPayment {
  id:          string;   // pay_XXXXXXXXXXXXXXXX
  entity:      'payment';
  amount:      number;   // paise
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

// ─── Auth header ──────────────────────────────────────────────────────────────

function authHeader(): HeadersInit {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error(
      'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }
  const encoded = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  return {
    Authorization:  `Basic ${encoded}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

// ─── Create Razorpay order ────────────────────────────────────────────────────

export async function createRazorpayOrder(
  input: RazorpayOrderInput
): Promise<RazorpayOrderResponse> {
  const res = await fetch(`${RZP_BASE}/orders`, {
    method:  'POST',
    headers: authHeader(),
    body:    JSON.stringify(input),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.error?.description ?? body?.error?.code ?? 'Razorpay order creation failed';
    throw new Error(`[Razorpay] ${res.status}: ${msg}`);
  }

  return body as RazorpayOrderResponse;
}

// ─── Fetch payment details ────────────────────────────────────────────────────

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

// ─── Fetch payments for a Razorpay order ─────────────────────────────────────

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

// ─── Verify payment signature (client-side callback) ─────────────────────────
/**
 * Called after frontend receives razorpay_payment_id, razorpay_order_id,
 * razorpay_signature from the Razorpay checkout callback.
 *
 * Signature is HMAC-SHA256 over: razorpay_order_id + "|" + razorpay_payment_id
 *
 * Throws if signature does not match.
 */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId:  string,
  razorpayPaymentId: string,
  signature:         string,
): void {
  if (!KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_SECRET not configured for signature verification');
  }

  const signatureData = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(signatureData)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Razorpay payment signature mismatch');
  }
}

// ─── Verify webhook signature ─────────────────────────────────────────────────
/**
 * Razorpay webhooks include:
 *   x-razorpay-signature  — HMAC-SHA256(rawBody, WEBHOOK_SECRET) as hex
 *
 * Throws if signature is invalid.
 */
export function verifyRazorpayWebhook(
  rawBody:   string,
  signature: string,
): void {
  if (!WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET not configured for webhook verification');
  }

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Razorpay webhook signature mismatch');
  }
}

// ─── Map Razorpay payment status → internal status ───────────────────────────

export function mapRazorpayStatus(
  status: string
): 'paid' | 'failed' | 'pending' {
  switch (status?.toLowerCase()) {
    case 'captured':
    case 'authorized': // captured is preferred; authorized means funds held
      return 'paid';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

// ─── Public key (safe to expose to frontend) ──────────────────────────────────

export function getRazorpayKeyId(): string {
  if (!KEY_ID) throw new Error('RAZORPAY_KEY_ID not configured');
  return KEY_ID;
}
