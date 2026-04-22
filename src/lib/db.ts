/**
 * db.ts — Supabase data layer for Rare Ease
 * All CRUD operations used by both the user-facing site and admin panel.
 * Import from here instead of mockData / adminData everywhere.
 */

import { createClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabaseAdmin';
import type {
  Product, Category, Variant, Inventory,
  Order, OrderItem, Review,
  WishlistItem, Address, Coupon, ExchangeRequest,
} from '@/types';
import type { AdminOrder, AdminReview, ExchangeRequest as AdminExchange, HeroSlide, AnnouncementMsg } from '@/lib/adminData';

// ─── helpers ──────────────────────────────────────────────────────────────────

function supabase() {
  return createClient();
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase()
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('fetchCategories', error); return []; }
  return data ?? [];
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchProducts', error); return []; }
  return (data ?? []).map(normaliseProduct);
}

export async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  const { data, error } = await supabase()
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchProductsByCategory', error); return []; }
  return (data ?? []).map(normaliseProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase()
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return normaliseProduct(data);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .eq('is_featured', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchFeaturedProducts', error); return []; }
  return (data ?? []).map(normaliseProduct);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase()
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .in('id', ids);
  if (error) { console.error('fetchProductsByIds', error); return []; }
  return (data ?? []).map(normaliseProduct);
}

/** Flatten Supabase's nested structure into our Product type */
function normaliseProduct(raw: Record<string, unknown>): Product {
  const variants: Variant[] = ((raw.variants as Record<string, unknown>[]) ?? []).map((v) => ({
    id: v.id as string,
    product_id: v.product_id as string,
    size: v.size as Variant['size'],
    sku: v.sku as string,
  }));

  const inventory: Inventory[] = ((raw.variants as Record<string, unknown>[]) ?? []).flatMap((v) => {
    // Supabase returns inventory as a single object (not array) when variant_id has a UNIQUE
    // constraint — PostgREST treats it as a to-one relation. Normalise to array here.
    const invRaw = v.inventory;
    const invArr: Record<string, unknown>[] = Array.isArray(invRaw)
      ? invRaw
      : invRaw && typeof invRaw === 'object'
        ? [invRaw as Record<string, unknown>]
        : [];
    return invArr.map((inv) => ({
      id: inv.id as string,
      variant_id: (inv.variant_id as string) ?? (v.id as string),
      quantity: inv.quantity as number,
      reserved: inv.reserved as number,
    }));
  });

  const media = ((raw.product_media as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((m) => ({
      id: m.id as string,
      product_id: raw.id as string,
      url: m.url as string,
      type: (m.type as 'image' | 'video') ?? 'image',
      position: m.position as number,
    }));

  return {
    id: raw.id as string,
    category_id: raw.category_id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    tagline: raw.tagline as string | undefined,
    description: raw.description as string | undefined,
    price: raw.price as number,
    original_price: raw.original_price as number | undefined,
    badge: raw.badge as string | undefined,
    is_featured: raw.is_featured as boolean,
    is_active: raw.is_active as boolean,
    created_at: raw.created_at as string,
    variants,
    inventory,
    media,
  };
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function fetchReviewsForProduct(productId: string) {
  const { data, error } = await supabase()
    .from('reviews')
    .select('id, rating, body, reviewer_name, created_at, is_verified_purchase')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchReviewsForProduct', error); return []; }
  return data ?? [];
}

export async function submitReview(review: {
  product_id: string;
  order_id?: string;
  reviewer_name: string;
  rating: number;
  title?: string;
  body: string;
}): Promise<boolean> {
  const client = supabase();
  const { data: { user } } = await client.auth.getUser();

  const { error } = await client.from('reviews').insert({
    product_id: review.product_id,
    order_id: review.order_id,
    user_id: user?.id ?? null,
    reviewer_name: review.reviewer_name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    is_verified_purchase: !!review.order_id,
    is_approved: false, // admin approves
  });
  if (error) { console.error('submitReview', error); return false; }
  return true;
}

// ─── ORDERS (USER) ────────────────────────────────────────────────────────────

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase()
    .from('orders')
    .select(`
      *,
      items:order_items (
        id, order_id, product_id, variant_id, quantity, price,
        product:products ( id, name, slug ),
        variant:variants ( id, size )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchUserOrders', error); return []; }
  return (data ?? []) as Order[];
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase()
    .from('orders')
    .select(`
      *,
      items:order_items (
        id, order_id, product_id, variant_id, quantity, price,
        product:products ( id, name, slug ),
        variant:variants ( id, size )
      )
    `)
    .eq('id', orderId)
    .single();
  if (error) return null;
  return data as Order;
}

// ─── WISHLIST ─────────────────────────────────────────────────────────────────

export async function fetchWishlistProductIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('wishlists')
    .select('product_id')
    .eq('user_id', userId);
  if (error) { console.error('fetchWishlistProductIds', error); return []; }
  return (data ?? []).map((r) => r.product_id as string);
}

export async function addToWishlist(userId: string, productId: string): Promise<boolean> {
  const { error } = await supabase()
    .from('wishlists')
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
  if (error) { console.error('addToWishlist', error); return false; }
  return true;
}

export async function removeFromWishlist(userId: string, productId: string): Promise<boolean> {
  const { error } = await supabase()
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) { console.error('removeFromWishlist', error); return false; }
  return true;
}

// ─── ADDRESSES ────────────────────────────────────────────────────────────────

export async function fetchUserAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase()
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) { console.error('fetchUserAddresses', error); return []; }
  return (data ?? []) as Address[];
}

export async function upsertAddress(address: Omit<Address, 'id' | 'created_at'> & { id?: string }): Promise<Address | null> {
  const client = supabase();
  if (address.is_default) {
    await client.from('addresses')
      .update({ is_default: false })
      .eq('user_id', address.user_id);
  }
  const { data, error } = address.id
    ? await client.from('addresses').update({ ...address }).eq('id', address.id).select().single()
    : await client.from('addresses').insert({ ...address }).select().single();
  if (error) { console.error('upsertAddress', error); return null; }
  return data as Address;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const { error } = await supabase().from('addresses').delete().eq('id', id);
  if (error) { console.error('deleteAddress', error); return false; }
  return true;
}

// ─── COUPON VALIDATION ────────────────────────────────────────────────────────

export async function validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  const res = await fetch('/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  });
  return res.json();
}

// ─── EXCHANGE REQUESTS (USER) ─────────────────────────────────────────────────

export async function submitExchangeRequest(req: {
  order_id: string;
  user_id?: string;
  type: 'exchange' | 'cancellation';
  reason: string;
  reason_label: string;
  items: { name: string; size: string; qty: number; price: number }[];
  want_size?: string;
  delivered_at?: string;
  within_window: boolean;
  shipping_by: 'rareease' | 'customer';
  proof_note?: string;
}): Promise<boolean> {
  const { error } = await supabase().from('exchange_requests').insert(req);
  if (error) { console.error('submitExchangeRequest', error); return false; }
  return true;
}

// ─── NOTIFY ME ────────────────────────────────────────────────────────────────

export async function subscribeNotifyMe(productId: string, variantId: string, email: string, size: string): Promise<boolean> {
  const { error } = await supabase()
    .from('notify_me')
    .upsert({ product_id: productId, variant_id: variantId, email, size }, { onConflict: 'variant_id,email' });
  if (error) { console.error('subscribeNotifyMe', error); return false; }
  return true;
}

// ─── SITE CONTENT (hero / announcements) ──────────────────────────────────────
// Stored in Supabase via a simple key-value approach using a `site_settings` table.
// If the table doesn't exist yet, we fall back to defaults gracefully.

export async function fetchSiteSettings<T>(key: string, defaultValue: T): Promise<T> {
  const { data, error } = await supabase()
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return defaultValue;
  try { return JSON.parse(data.value as string) as T; } catch { return defaultValue; }
}

export async function upsertSiteSettings(key: string, value: unknown): Promise<boolean> {
  const { error } = await supabase()
    .from('site_settings')
    .upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
  if (error) { console.error('upsertSiteSettings', error); return false; }
  return true;
}

// ─── ADMIN — requires service-role client (server-side only) ──────────────────

export async function adminFetchAllOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select(`
      id, status, payment_status, payment_method, subtotal, total, shipping_address,
      tracking_number, courier, notes, created_at,
      items:order_items (
        quantity, price,
        product:products ( name ),
        variant:variants ( size )
      )
    `)
    .order('created_at', { ascending: false });
  if (error) { console.error('adminFetchAllOrders', error); return []; }

  return (data ?? []).map((o) => {
    const addr = o.shipping_address as Record<string, string>;
    return {
      id: o.id as string,
      customer: addr?.name ?? '—',
      email: addr?.email ?? '—',
      phone: addr?.phone ?? '—',
      city: addr?.city ?? '—',
      address: [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode].filter(Boolean).join(', '),
      items: ((o.items as Record<string, unknown>[]) ?? []).map((item) => ({
        name: (item.product as { name?: string })?.name ?? '—',
        size: (item.variant as { size?: string })?.size ?? '—',
        qty: item.quantity as number,
        price: item.price as number,
      })),
      subtotal: o.subtotal as number,
      total: o.total as number,
      status: o.status as AdminOrder['status'],
      payment: o.payment_status as AdminOrder['payment'],
      paymentMethod: (o.payment_method as string) === 'cod' ? 'COD' : 'Online',
      createdAt: o.created_at as string,
      trackingNumber: o.tracking_number as string | undefined,
      courier: o.courier as string | undefined,
      notes: o.notes as string | undefined,
    };
  });
}

export async function adminUpdateOrderStatus(
  id: string,
  status: AdminOrder['status'],
  extra?: { tracking_number?: string; courier?: string; notes?: string }
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('orders')
    .update({ status, ...extra })
    .eq('id', id);
  if (error) { console.error('adminUpdateOrderStatus', error); return false; }
  return true;
}

export async function adminFetchAllProducts(): Promise<Product[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('products')
    .select(`
      *,
      variants (
        id, product_id, size, sku,
        inventory ( id, variant_id, quantity, reserved )
      ),
      product_media ( id, product_id, url, type, position )
    `)
    .order('created_at', { ascending: true });
  if (error) { console.error('adminFetchAllProducts', error); return []; }
  return (data ?? []).map(normaliseProduct);
}

export async function adminUpsertProduct(product: Omit<Product, 'variants' | 'inventory' | 'category'>, variants: Variant[], inventory: Omit<Inventory, 'variant'>[]): Promise<boolean> {
  const admin = createAdminClient();
  const { error: pErr } = await admin.from('products').upsert(product, { onConflict: 'id' });
  if (pErr) { console.error('adminUpsertProduct:product', pErr); return false; }

  for (const v of variants) {
    const { error: vErr } = await admin.from('variants').upsert(v, { onConflict: 'id' });
    if (vErr) { console.error('adminUpsertProduct:variant', vErr); }
  }
  for (const inv of inventory) {
    const { error: iErr } = await admin.from('inventory').upsert(inv, { onConflict: 'variant_id' });
    if (iErr) { console.error('adminUpsertProduct:inventory', iErr); }
  }
  return true;
}

export async function adminToggleProductActive(id: string, is_active: boolean): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('products').update({ is_active }).eq('id', id);
  if (error) { console.error('adminToggleProductActive', error); return false; }
  return true;
}

export async function adminToggleProductFeatured(id: string, is_featured: boolean): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('products').update({ is_featured }).eq('id', id);
  if (error) { console.error('adminToggleProductFeatured', error); return false; }
  return true;
}

export async function adminUpdateProductPrice(id: string, price: number, original_price?: number): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('products').update({ price, original_price: original_price ?? null }).eq('id', id);
  if (error) { console.error('adminUpdateProductPrice', error); return false; }
  return true;
}

export async function adminUpdateProductBadge(id: string, badge: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('products').update({ badge: badge || null }).eq('id', id);
  if (error) { console.error('adminUpdateProductBadge', error); return false; }
  return true;
}

export async function adminUpdateVariantStock(variantId: string, quantity: number): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('inventory')
    .upsert({ variant_id: variantId, quantity, reserved: 0 }, { onConflict: 'variant_id' });
  if (error) { console.error('adminUpdateVariantStock', error); return false; }
  return true;
}

export async function adminDeleteProduct(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('products').delete().eq('id', id);
  if (error) { console.error('adminDeleteProduct', error); return false; }
  return true;
}

// ── Admin reviews ─────────────────────────────────────────────────────────────

export async function adminFetchAllReviews(): Promise<AdminReview[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reviews')
    .select('id, product_id, reviewer_name, rating, body, is_verified_purchase, is_approved, created_at, products(name)')
    .order('created_at', { ascending: false });
  if (error) { console.error('adminFetchAllReviews', error); return []; }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    productId: r.product_id as string,
    productName: (r.products as { name?: string } | null)?.name ?? '—',
    customer: (r.reviewer_name as string) ?? 'Anonymous',
    rating: r.rating as number,
    body: r.body as string,
    approved: r.is_approved as boolean,
    verified: r.is_verified_purchase as boolean,
    createdAt: (r.created_at as string).slice(0, 10),
  }));
}

export async function adminApproveReview(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('reviews').update({ is_approved: true }).eq('id', id);
  if (error) { console.error('adminApproveReview', error); return false; }
  return true;
}

export async function adminDeleteReview(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('reviews').delete().eq('id', id);
  if (error) { console.error('adminDeleteReview', error); return false; }
  return true;
}

// ── Admin coupons ─────────────────────────────────────────────────────────────

export async function adminFetchAllCoupons(): Promise<Coupon[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) { console.error('adminFetchAllCoupons', error); return []; }
  return (data ?? []) as Coupon[];
}

export async function adminUpsertCoupon(coupon: Partial<Coupon> & { code: string }): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('coupons')
    .upsert({ ...coupon, code: coupon.code.toUpperCase() }, { onConflict: 'id' });
  if (error) { console.error('adminUpsertCoupon', error); return false; }
  return true;
}

export async function adminDeleteCoupon(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('coupons').delete().eq('id', id);
  if (error) { console.error('adminDeleteCoupon', error); return false; }
  return true;
}

// ── Admin exchange requests ───────────────────────────────────────────────────

export async function adminFetchAllExchanges(): Promise<AdminExchange[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('exchange_requests')
    .select('*')
    .order('requested_at', { ascending: false });
  if (error) { console.error('adminFetchAllExchanges', error); return []; }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    orderId: r.order_id as string,
    customer: (r.items as { name?: string }[])?.[0]?.name ?? '—',
    email: '—',
    phone: '—',
    type: r.type as 'exchange' | 'cancellation',
    reason: r.reason as AdminExchange['reason'],
    reasonLabel: r.reason_label as string,
    items: (r.items as AdminExchange['items']) ?? [],
    wantSize: r.want_size as string | undefined,
    status: r.status as AdminExchange['status'],
    deliveredAt: r.delivered_at as string | undefined,
    requestedAt: r.requested_at as string,
    withinWindow: r.within_window as boolean,
    shippingBy: r.shipping_by as 'rareease' | 'customer',
    adminNote: r.admin_note as string | undefined,
    proofNote: r.proof_note as string | undefined,
  }));
}

export async function adminUpdateExchangeStatus(
  id: string,
  status: AdminExchange['status'],
  adminNote?: string
): Promise<boolean> {
  const admin = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (adminNote !== undefined) update.admin_note = adminNote;
  const { error } = await admin.from('exchange_requests').update(update).eq('id', id);
  if (error) { console.error('adminUpdateExchangeStatus', error); return false; }
  return true;
}

// ── Admin customers ───────────────────────────────────────────────────────────

export async function adminFetchAllCustomers() {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, email, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.error('adminFetchAllCustomers', error); return []; }

  if (!profiles || profiles.length === 0) return [];

  // Single query for ALL paid orders across all customers — eliminates the N+1
  const profileIds = profiles.map(p => p.id as string);
  const { data: allOrders } = await admin
    .from('orders')
    .select('user_id, total, created_at')
    .in('user_id', profileIds)
    .eq('payment_status', 'paid');

  // Group orders by user_id in memory
  const ordersByUser = new Map<string, { total: number; created_at: string }[]>();
  for (const o of (allOrders ?? [])) {
    const uid = o.user_id as string;
    if (!ordersByUser.has(uid)) ordersByUser.set(uid, []);
    ordersByUser.get(uid)!.push({ total: o.total as number, created_at: o.created_at as string });
  }

  return profiles.map(p => {
    const orders     = ordersByUser.get(p.id as string) ?? [];
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const lastOrder  = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return {
      id:         p.id as string,
      name:       (p.full_name as string) ?? '—',
      email:      (p.email as string)     ?? '—',
      phone:      (p.phone as string)     ?? '—',
      city:       '—',
      orders:     orders.length,
      totalSpent,
      joined:     new Date(p.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      lastOrder:  lastOrder
        ? new Date(lastOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
    };
  });
}

// ── Admin categories ──────────────────────────────────────────────────────────

export async function adminFetchAllCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('categories').select('*').order('sort_order');
  if (error) { console.error('adminFetchAllCategories', error); return []; }
  return (data ?? []) as Category[];
}

export async function adminUpsertCategory(cat: Partial<Category> & { slug: string }): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('categories').upsert(cat, { onConflict: 'id' });
  if (error) { console.error('adminUpsertCategory', error); return false; }
  return true;
}

export async function adminDeleteCategory(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from('categories').delete().eq('id', id);
  if (error) { console.error('adminDeleteCategory', error); return false; }
  return true;
}

// ── Admin site content ────────────────────────────────────────────────────────

export async function adminFetchHeroSlides(defaults: HeroSlide[]): Promise<HeroSlide[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('site_settings').select('value').eq('key', 'hero_slides').single();
  if (!data?.value) return defaults;
  try { return JSON.parse(data.value as string) as HeroSlide[]; } catch { return defaults; }
}

export async function adminSaveHeroSlides(slides: HeroSlide[]): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('site_settings')
    .upsert({ key: 'hero_slides', value: JSON.stringify(slides) }, { onConflict: 'key' });
  if (error) { console.error('adminSaveHeroSlides', error); return false; }
  return true;
}

export async function adminFetchAnnouncements(defaults: AnnouncementMsg[]): Promise<AnnouncementMsg[]> {
  const admin = createAdminClient();
  const { data } = await admin.from('site_settings').select('value').eq('key', 'announcements').single();
  if (!data?.value) return defaults;
  try { return JSON.parse(data.value as string) as AnnouncementMsg[]; } catch { return defaults; }
}

export async function adminSaveAnnouncements(msgs: AnnouncementMsg[]): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('site_settings')
    .upsert({ key: 'announcements', value: JSON.stringify(msgs) }, { onConflict: 'key' });
  if (error) { console.error('adminSaveAnnouncements', error); return false; }
  return true;
}

// ── Admin dashboard stats ─────────────────────────────────────────────────────

export async function adminFetchDashboardStats() {
  const admin = createAdminClient();

  const [ordersRes, reviewsRes, exchangesRes, inventoryRes] = await Promise.all([
    admin.from('orders').select('id, total, payment_status, status, created_at'),
    admin.from('reviews').select('id, is_approved'),
    admin.from('exchange_requests').select('id, status'),
    admin.from('inventory').select('variant_id, quantity, variants(product_id, size, products(name))'),
  ]);

  const orders = ordersRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const exchanges = exchangesRes.data ?? [];
  const inventory = inventoryRes.data ?? [];

  const revenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((s, o) => s + (o.total as number), 0);

  const pending = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const shipped = orders.filter((o) => o.status === 'shipped').length;
  const totalOrders = orders.length;
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const pendingExchanges = exchanges.filter((e) => e.status === 'pending').length;

  const lowStock = inventory
    .filter((inv) => (inv.quantity as number) <= 3)
    .slice(0, 8)
    .map((inv) => {
      const variant = inv.variants as { size?: string; products?: { name?: string }; product_id?: string } | null;
      return {
        name: variant?.products?.name ?? '—',
        size: variant?.size ?? '—',
        qty: inv.quantity as number,
        productId: variant?.product_id ?? '',
      };
    });

  // Revenue chart data (last 14 days)
  const revenueByDay: Record<string, number> = {};
  orders
    .filter((o) => o.payment_status === 'paid')
    .forEach((o) => {
      const day = (o.created_at as string).slice(0, 10);
      revenueByDay[day] = (revenueByDay[day] ?? 0) + (o.total as number);
    });

  return { revenue, pending, shipped, totalOrders, lowStock, pendingReviews, pendingExchanges, revenueByDay };
}
