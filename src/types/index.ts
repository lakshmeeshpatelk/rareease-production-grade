// ─── Database Types ───────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name: string;
  label: string;
  description?: string;
  image_url?: string;
  hero_badge?: string;
  card_class: string;
  pattern_class: string;
  is_active?: boolean;
  sort_order?: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  price: number;
  original_price?: number;
  badge?: string;
  is_featured: boolean;
  is_active: boolean;
  homepage_featured?: boolean;
  homepage_sort_order?: number;
  collection_sort_order?: number;
  created_at: string;
  // joined
  category?: Category;
  media?: ProductMedia[];
  variants?: Variant[];
  inventory?: Inventory[];
}

export interface ProductMedia {
  id: string;
  product_id: string;
  url: string;
  type: 'image' | 'video';
  position: number;
  alt_text?: string;
}

export interface Variant {
  id: string;
  product_id: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  sku: string;
}

export interface Inventory {
  id: string;
  variant_id: string;
  quantity: number;
  reserved: number;
  // joined
  variant?: Variant;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;           // ← added: checkout always collects email
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  user_id?: string;        // optional: guest checkout allowed
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'online' | 'cod';
  // Cashfree
  cashfree_order_id?:   string;
  cashfree_payment_id?: string;
  // Shiprocket
  shiprocket_order_id?:    number;
  shiprocket_shipment_id?: number;
  awb_code?: string;
  coupon_code?: string;
  discount_amount: number;
  subtotal: number;
  shipping: number;
  total: number;
  shipping_address: ShippingAddress;
  tracking_number?: string;
  courier?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // joined
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  // joined
  product?: Product;
  variant?: Variant;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  body: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  // joined
  user?: { full_name: string; avatar_url?: string };
}

export interface Address {
  id: string;
  user_id: string;
  label?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  is_default: boolean;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  min_order: number;       // ← snake_case matches DB
  max_uses: number;        // ← snake_case matches DB
  used_count: number;      // ← snake_case matches DB
  active: boolean;
  expires_at?: string;     // ← matches DB field name
  created_at?: string;
}

export interface ExchangeRequest {
  id: string;
  order_id: string;
  user_id?: string;
  type: 'exchange' | 'cancellation';
  reason: 'damage' | 'wrong_item' | 'size' | 'cancel_before_production' | 'other';
  reason_label?: string;
  items?: { name: string; size: string; qty: number; price: number }[];  // ← jsonb in DB
  want_size?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  delivered_at?: string;
  requested_at: string;
  within_window: boolean;
  shipping_by: 'rareease' | 'customer';
  admin_note?: string;
  proof_note?: string;
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image?: string;
  slug: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  type: 'drop' | 'sale' | 'order' | 'alert';
  icon: string;
  msg: string;
  time: string;
  unread: boolean;
}

export interface Toast {
  id: string;
  icon: string;
  message: string;
}

// ─── Payment Types ────────────────────────────────────────────────────────────

/** Returned by POST /api/payments/create for online orders */
export interface CreateOrderResponse {
  orderId:           string;
  paymentSessionId:  string;   // Cashfree payment_session_id — pass to cashfree.checkout()
  cashfreeOrderId?:  string;
  total:             number;
}

/** Returned by POST /api/payments/verify */
export interface VerifyOrderResponse {
  success:       boolean;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus:   string;
}