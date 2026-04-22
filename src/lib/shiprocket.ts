/**
 * Shiprocket — server-side helpers
 *
 * Docs: https://apidocs.shiprocket.in/
 *
 * Required env vars:
 *   SHIPROCKET_EMAIL    — registered email on Shiprocket account
 *   SHIPROCKET_PASSWORD — password for Shiprocket account
 *
 * Token is fetched on demand and cached in-memory for 24 hours
 * (tokens are valid for 10 days but we refresh early to be safe).
 */

const BASE = 'https://apiv2.shiprocket.in/v1/external';

// In-memory token cache (lives as long as the Node process / serverless warm instance)
let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const email    = process.env.SHIPROCKET_EMAIL    ?? '';
  const password = process.env.SHIPROCKET_PASSWORD ?? '';

  if (!email || !password) {
    throw new Error('Shiprocket credentials not configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD)');
  }

  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error(`Shiprocket auth failed (${res.status})`);

  const data = await res.json() as { token: string };
  _token       = data.token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return _token;
}

function srHeaders(token: string) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShiprocketOrderItem {
  name:        string;
  sku:         string;
  units:       number;
  selling_price: number;
  discount?:   number;
  tax?:        number;
  hsn?:        string;
}

export interface ShiprocketCreateOrderInput {
  orderId:       string;          // your internal order ID
  orderDate:     string;          // ISO date string
  pickupLocation: string;         // pickup location name set in Shiprocket dashboard
  billingName:    string;
  billingAddress: string;
  billingAddress2?: string;
  billingCity:    string;
  billingPincode: string;
  billingState:   string;
  billingCountry: string;
  billingEmail:   string;
  billingPhone:   string;
  // Shipping = billing unless overridden
  shippingName?:    string;
  shippingAddress?: string;
  shippingAddress2?: string;
  shippingCity?:    string;
  shippingPincode?: string;
  shippingState?:   string;
  shippingCountry?: string;
  shippingEmail?:   string;
  shippingPhone?:   string;
  // Items
  items:          ShiprocketOrderItem[];
  paymentMethod:  'Prepaid' | 'COD';
  subTotal:       number;
  length:         number;          // cm
  breadth:        number;          // cm
  height:         number;          // cm
  weight:         number;          // kg
}

export interface ShiprocketOrderResponse {
  order_id:       number;
  shipment_id:    number;
  status:         string;
  status_code:    number;
  onboarding_completed_now: boolean;
  awb_code?:      string;
  courier_name?:  string;
  courier_company_id?: number;
}

/** Create a forward shipment order on Shiprocket */
export async function createShiprocketOrder(
  input: ShiprocketCreateOrderInput
): Promise<ShiprocketOrderResponse> {
  const token = await getToken();

  // Build shipping block (falls back to billing if not specified)
  const body = {
    order_id:         input.orderId,
    order_date:       input.orderDate,
    pickup_location:  input.pickupLocation,
    channel_id:       '',
    comment:          '',
    billing_customer_name:    input.billingName,
    billing_last_name:        '',
    billing_address:          input.billingAddress,
    billing_address_2:        input.billingAddress2 ?? '',
    billing_city:             input.billingCity,
    billing_pincode:          input.billingPincode,
    billing_state:            input.billingState,
    billing_country:          input.billingCountry,
    billing_email:            input.billingEmail,
    billing_phone:            input.billingPhone,
    shipping_is_billing:      !input.shippingAddress,
    shipping_customer_name:   input.shippingName    ?? input.billingName,
    shipping_last_name:       '',
    shipping_address:         input.shippingAddress  ?? input.billingAddress,
    shipping_address_2:       input.shippingAddress2 ?? input.billingAddress2 ?? '',
    shipping_city:            input.shippingCity     ?? input.billingCity,
    shipping_pincode:         input.shippingPincode  ?? input.billingPincode,
    shipping_country:         input.shippingCountry  ?? input.billingCountry,
    shipping_state:           input.shippingState    ?? input.billingState,
    shipping_email:           input.shippingEmail    ?? input.billingEmail,
    shipping_phone:           input.shippingPhone    ?? input.billingPhone,
    order_items: input.items.map(i => ({
      name:          i.name,
      sku:           i.sku,
      units:         i.units,
      selling_price: i.selling_price,
      discount:      i.discount ?? 0,
      tax:           i.tax ?? 0,
      hsn:           i.hsn ?? '',
    })),
    payment_method: input.paymentMethod,
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total:      input.subTotal,
    length:         input.length,
    breadth:        input.breadth,
    height:         input.height,
    weight:         input.weight,
  };

  const res = await fetch(`${BASE}/orders/create/adhoc`, {
    method:  'POST',
    headers: srHeaders(token),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shiprocket createOrder failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<ShiprocketOrderResponse>;
}

export interface ShiprocketTrackingResponse {
  tracking_data: {
    track_status:    number;
    shipment_status: number;
    shipment_track:  Array<{
      id:             number;
      awb_code:       string;
      courier_company_id: number;
      courier_name:   string;
      current_status: string;
      delivered_date?: string;
      estimated_delivery_date?: string;
      shipment_track_activities?: Array<{
        date:     string;
        status:   string;
        activity: string;
        location: string;
      }>;
    }>;
    shipment_track_activities?: Array<{
      date:     string;
      status:   string;
      activity: string;
      location: string;
    }>;
    track_url?: string;
  };
}

/** Track a shipment by AWB code */
export async function trackShiprocketShipment(
  awbCode: string
): Promise<ShiprocketTrackingResponse> {
  const token = await getToken();

  const res = await fetch(`${BASE}/courier/track/awb/${awbCode}`, {
    headers: srHeaders(token),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shiprocket track failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<ShiprocketTrackingResponse>;
}

export interface ShiprocketPincodeResponse {
  status:            number;
  city?:             string;
  state?:            string;
  cod?:              boolean;
  prepaid?:          boolean;
  pickup_available?: boolean;
}

/** Check serviceability for a pincode */
export async function checkShiprocketPincode(
  pincode: string
): Promise<ShiprocketPincodeResponse> {
  const token = await getToken();

  const res = await fetch(
    `${BASE}/courier/serviceability/?pickup_postcode=110001&delivery_postcode=${pincode}&cod=1&weight=0.5`,
    { headers: srHeaders(token) }
  );

  if (!res.ok) return { status: 0 };

  const data = await res.json() as { status: number; data?: { available_courier_companies?: unknown[] } };
  return {
    status:  data.status,
    cod:     true,
    prepaid: true,
  };
}

/** Cancel a Shiprocket order by Shiprocket order IDs */
export async function cancelShiprocketOrder(
  shiprocketOrderIds: number[]
): Promise<void> {
  const token = await getToken();

  const res = await fetch(`${BASE}/orders/cancel`, {
    method:  'POST',
    headers: srHeaders(token),
    body:    JSON.stringify({ ids: shiprocketOrderIds }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shiprocket cancelOrder failed (${res.status}): ${err}`);
  }
}

export const isShiprocketConfigured = Boolean(
  process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD
);

// ─── Shared order-push helper ────────────────────────────────────────────────
// Used by both payments/create (COD) and payments/webhook (Prepaid).
// Extracted here to avoid identical code in two separate route files.

export const SHIPROCKET_DEFAULTS = {
  length:  30,   // cm
  breadth: 20,   // cm
  height:  10,   // cm
  weight:  0.5,  // kg per unit
} as const;

export interface PushOrderItem {
  productId:   string;
  variantId:   string;
  quantity:    number;
  serverPrice: number;
  productName: string;
}

/**
 * Push an order to Shiprocket and store the resulting IDs on the order row.
 * Accepts a Supabase admin client so the caller controls auth context.
 */
export async function pushOrderToShiprocket(
  orderId:       string,
  addr:          Record<string, string>,
  items:         PushOrderItem[],
  total:         number,
  paymentMethod: 'Prepaid' | 'COD',
  supabase:      ReturnType<typeof import('@/lib/supabaseAdmin').createAdminClient>
): Promise<void> {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary';

  const result = await createShiprocketOrder({
    orderId,
    orderDate:       new Date().toISOString().split('T')[0],
    pickupLocation,
    billingName:     addr.name,
    billingAddress:  addr.line1,
    billingAddress2: addr.line2,
    billingCity:     addr.city,
    billingPincode:  addr.pincode,
    billingState:    addr.state,
    billingCountry:  addr.country ?? 'India',
    billingEmail:    addr.email,
    billingPhone:    addr.phone,
    items: items.map(i => ({
      name:          i.productName,
      sku:           i.variantId,
      units:         i.quantity,
      selling_price: i.serverPrice,
    })),
    paymentMethod,
    subTotal: total,
    length:   SHIPROCKET_DEFAULTS.length,
    breadth:  SHIPROCKET_DEFAULTS.breadth,
    height:   SHIPROCKET_DEFAULTS.height,
    weight:   SHIPROCKET_DEFAULTS.weight * items.reduce((s, i) => s + i.quantity, 0),
  });

  await supabase.from('orders').update({
    shiprocket_order_id:    result.order_id,
    shiprocket_shipment_id: result.shipment_id,
    awb_code:               result.awb_code    ?? null,
    courier:                result.courier_name ?? null,
  }).eq('id', orderId);
}