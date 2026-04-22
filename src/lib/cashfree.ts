import crypto from 'crypto';

/**
 * Cashfree Payments — server-side helpers
 *
 * Docs: https://docs.cashfree.com/docs/api-reference
 *
 * Required env vars:
 *   CASHFREE_APP_ID           — App ID from Cashfree Dashboard
 *   CASHFREE_SECRET_KEY       — Secret key from Cashfree Dashboard
 *   CASHFREE_ENV              — "sandbox" | "production"  (default: sandbox)
 *   NEXT_PUBLIC_CASHFREE_ENV  — same value, exposed to browser
 */

const APP_ID    = process.env.CASHFREE_APP_ID    ?? '';
const SECRET    = process.env.CASHFREE_SECRET_KEY ?? '';
const CF_ENV    = (process.env.CASHFREE_ENV ?? 'sandbox') as 'sandbox' | 'production';

const BASE_URL =
  CF_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

/** Common headers for every Cashfree API call */
function cfHeaders() {
  return {
    'Content-Type':       'application/json',
    'x-api-version':      '2023-08-01',
    'x-client-id':        APP_ID,
    'x-client-secret':    SECRET,
  };
}

export interface CashfreeOrderInput {
  orderId:      string;
  amount:       number;          // in INR (rupees, not paise)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl:    string;          // browser redirect after payment
  notifyUrl?:   string;          // optional webhook URL override
  expiresAt?:   string;          // ISO timestamp — defaults to +30min
}

export interface CashfreeOrderResponse {
  cf_order_id:    string;
  order_id:       string;
  payment_session_id: string;
  order_status:   string;
  order_expiry_time: string;
}

/** Create a Cashfree order and get a payment_session_id for the JS SDK */
export async function createCashfreeOrder(
  input: CashfreeOrderInput
): Promise<CashfreeOrderResponse> {
  if (!APP_ID || !SECRET) {
    throw new Error('Cashfree credentials are not configured (CASHFREE_APP_ID / CASHFREE_SECRET_KEY)');
  }

  const expiresAt =
    input.expiresAt ??
    new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '+05:30');

  const body = {
    order_id:     input.orderId,
    order_amount: input.amount,
    order_currency: 'INR',
    customer_details: {
      customer_id:    input.customerPhone,   // unique customer identifier
      customer_name:  input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    },
    order_meta: {
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
    },
    order_expiry_time: expiresAt,
  };

  const res = await fetch(`${BASE_URL}/orders`, {
    method:  'POST',
    headers: cfHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cashfree createOrder failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<CashfreeOrderResponse>;
}

export interface CashfreePaymentStatus {
  order_id:       string;
  order_status:   'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
  order_amount:   number;
  cf_order_id:    string;
  payments?: Array<{
    cf_payment_id: number;
    payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
    payment_amount: number;
    payment_time:  string;
    payment_method?: Record<string, unknown>;
  }>;
}

/** Fetch the latest status of a Cashfree order (server-to-server) */
export async function getCashfreeOrderStatus(
  orderId: string
): Promise<CashfreePaymentStatus> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: cfHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cashfree getOrderStatus failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<CashfreePaymentStatus>;
}

/**
 * Verify a Cashfree webhook signature.
 *
 * Cashfree signs webhook payloads with:
 *   HMAC-SHA256( timestamp + rawBody, SECRET_KEY )
 * and sends it as the "x-webhook-signature" header,
 * along with the timestamp in "x-webhook-timestamp".
 */
export function verifyCashfreeWebhook(
  rawBody:   string,
  signature: string,
  timestamp: string
): boolean {
  if (!SECRET) return false;

  const payload  = timestamp + rawBody;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export const isCashfreeConfigured = Boolean(APP_ID && SECRET);
