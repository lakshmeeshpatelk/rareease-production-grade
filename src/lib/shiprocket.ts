/**
 * src/lib/shiprocket.ts
 * Shiprocket API client
 *
 * Features:
 *  - JWT token cached in-memory (tokens valid 10 days; refreshed after 23 h)
 *  - Automatic retry on 401 (token rotation)
 *  - Normalises address fields for Shiprocket's exact format
 *  - Handles both prepaid and COD
 */

const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SROrderInput {
  order_id:         string;
  order_date:       string;        // ISO-8601
  shipping_address: {
    name: string; phone: string; email?: string;
    line1: string; line2?: string;
    city: string; state: string; pincode: string;
  };
  items: Array<{
    product_id: string;
    variant_id: string;
    quantity:   number;
    price:      number;
  }>;
  total:            number;
  payment_method:   'prepaid' | 'cod';
}

interface SROrderResult {
  order_id:    number;
  shipment_id: number;
  status:      string;
}

// ─── Token cache ───────────────────────────────────────────────────────────────

let _token: string | null    = null;
let _tokenExpiry: number     = 0;   // Unix ms

async function getToken(): Promise<string> {
  const now = Date.now();
  // Refresh 1 hour before expiry (token valid 10 days = 864_000_000 ms)
  if (_token && now < _tokenExpiry - 3_600_000) return _token;

  const email    = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not set');
  }

  const res  = await fetch(`${SR_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (!res.ok || !data.token) {
    throw new Error(`[Shiprocket] Auth failed: ${data?.message ?? res.status}`);
  }

  _token       = data.token as string;
  // Cache for 23 hours
  _tokenExpiry = now + 23 * 60 * 60 * 1000;
  return _token;
}

// ─── Generic authenticated fetch with 401 retry ───────────────────────────────

async function srFetch(path: string, opts: RequestInit, retry = true): Promise<any> {
  const token = await getToken();
  const res   = await fetch(`${SR_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });

  // Token expired — invalidate and retry once
  if (res.status === 401 && retry) {
    _token = null; _tokenExpiry = 0;
    return srFetch(path, opts, false);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = body?.message ?? body?.error ?? `HTTP ${res.status}`;
    throw new Error(`[Shiprocket] ${path}: ${msg}`);
  }

  return body;
}

// ─── Create Shiprocket order ───────────────────────────────────────────────────

export async function createShiprocketOrder(input: SROrderInput): Promise<SROrderResult> {
  const a = input.shipping_address;

  // Shiprocket requires dimensions even for apparel — use sensible defaults
  const payload = {
    order_id:             input.order_id,
    order_date:           input.order_date.slice(0, 19).replace('T', ' '),
    pickup_location:      process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
    channel_id:           '',
    comment:              'Rareease order',
    billing_customer_name:  a.name,
    billing_last_name:      '',
    billing_address:        a.line1,
    billing_address_2:      a.line2 ?? '',
    billing_city:           a.city,
    billing_pincode:        a.pincode,
    billing_state:          a.state,
    billing_country:        'India',
    billing_email:          a.email ?? '',
    billing_phone:          a.phone,
    shipping_is_billing:    true,          // same as billing
    order_items: input.items.map(item => ({
      name:      `Product ${item.product_id}`,
      sku:       item.variant_id,
      units:     item.quantity,
      selling_price: item.price,
      discount:  0,
      tax:       '',
      hsn:       '',
    })),
    payment_method:       input.payment_method === 'cod' ? 'COD' : 'Prepaid',
    shipping_charges:     0,
    giftwrap_charges:     0,
    transaction_charges:  0,
    total_discount:       0,
    sub_total:            input.total,
    length:               30,   // cm
    breadth:              25,
    height:               2,
    weight:               0.3,  // kg
  };

  const data = await srFetch('/orders/create/adhoc', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });

  return {
    order_id:    data?.order_id    as number,
    shipment_id: data?.shipment_id as number,
    status:      data?.status      as string,
  };
}

// ─── Webhook route for Shiprocket tracking updates ────────────────────────────
// Handled in src/app/api/shiprocket/webhook/route.ts