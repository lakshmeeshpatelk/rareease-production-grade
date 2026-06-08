/**
 * src/lib/shiprocket.ts — FIXED
 *
 * Changes from original:
 *  FIX-1: Promise-based mutex prevents concurrent cold-start token races.
 *  FIX-2: Token validated as non-empty string before caching.
 *  FIX-3: Item name uses product_name when provided; fallback is variant_id
 *          (not "Product <uuid>" which is both ugly and wrong).
 *  FIX-4: cancelShiprocketOrder() added — called by orders/cancel route.
 *  FIX-5: SROrderResult now surfaces awb_code and courier when returned
 *          synchronously by Shiprocket (so push route can store them immediately).
 */

const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SROrderItem {
  product_id:    string;
  variant_id:    string;
  quantity:      number;
  price:         number;
  product_name?: string;
}

export interface SROrderInput {
  order_id:         string;
  order_date:       string;
  shipping_address: {
    name: string; phone: string; email?: string;
    line1: string; line2?: string;
    city: string; state: string; pincode: string;
  };
  items:          SROrderItem[];
  total:          number;
  payment_method: 'prepaid' | 'cod';
}

export interface SROrderResult {
  order_id:    number;
  shipment_id: number;
  status:      string;
  awb_code?:   string;
  courier?:    string;
}

// ─── Token cache with Promise mutex ───────────────────────────────────────────

let _token:      string | null        = null;
let _tokenExpiry: number              = 0;
let _refreshing:  Promise<string> | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_token && now < _tokenExpiry - 3_600_000) return _token;

  // FIX-1: Lock — wait if a refresh is already in flight
  if (_refreshing) return _refreshing;

  _refreshing = (async (): Promise<string> => {
    try {
      const email    = process.env.SHIPROCKET_EMAIL;
      const password = process.env.SHIPROCKET_PASSWORD;
      if (!email || !password) {
        throw new Error('[Shiprocket] SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not set');
      }

      const res  = await fetch(`${SR_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      // FIX-2: Validate token is a non-empty string
      if (!res.ok || typeof data.token !== 'string' || !data.token) {
        throw new Error(`[Shiprocket] Auth failed: ${data?.message ?? res.status}`);
      }

      _token       = data.token;
      _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
      return _token!;
    } finally {
      _refreshing = null; // always release the lock
    }
  })();

  return _refreshing;
}

// ─── Authenticated fetch with 401 retry ───────────────────────────────────────

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

  const payload = {
    order_id:              input.order_id,
    order_date:            input.order_date.slice(0, 19).replace('T', ' '),
    pickup_location:       process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
    channel_id:            '',
    comment:               'Rareease order',
    billing_customer_name: a.name,
    billing_last_name:     '',
    billing_address:       a.line1,
    billing_address_2:     a.line2 ?? '',
    billing_city:          a.city,
    billing_pincode:       a.pincode,
    billing_state:         a.state,
    billing_country:       'India',
    billing_email:         a.email ?? '',
    billing_phone:         a.phone,
    shipping_is_billing:   true,
    order_items: input.items.map(item => ({
      // FIX-3: Use real product name; fallback to variant_id not "Product <uuid>"
      name:          item.product_name ?? item.variant_id,
      sku:           item.variant_id,
      units:         item.quantity,
      selling_price: item.price,
      discount:      0,
      tax:           '',
      hsn:           '',
    })),
    payment_method:      input.payment_method === 'cod' ? 'COD' : 'Prepaid',
    shipping_charges:    0,
    giftwrap_charges:    0,
    transaction_charges: 0,
    total_discount:      0,
    sub_total:           input.total,
    length:              30,
    breadth:             25,
    height:              2,
    weight:              0.3,
  };

  const data = await srFetch('/orders/create/adhoc', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });

  return {
    order_id:    data?.order_id    as number,
    shipment_id: data?.shipment_id as number,
    status:      data?.status      as string,
    // FIX-5: Surface AWB/courier if Shiprocket returns them immediately
    awb_code:    data?.awb_code    as string | undefined,
    courier:     data?.courier     as string | undefined,
  };
}

// ─── FIX-4: Cancel a Shiprocket order ─────────────────────────────────────────

export async function cancelShiprocketOrder(shiprocketOrderId: number): Promise<void> {
  await srFetch('/orders/cancel', {
    method: 'POST',
    body:   JSON.stringify({ ids: [shiprocketOrderId] }),
  });
}