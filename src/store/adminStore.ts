'use client';

import { create } from 'zustand';
import type { AdminOrder, AdminReview, ExchangeRequest as AdminExchange, HeroSlide, AnnouncementMsg } from '@/lib/adminData';
import type { Product, Category, Coupon } from '@/types';

// ── Server-side API helpers ────────────────────────────────────────────────────
// Session is carried automatically via HttpOnly cookies set by Supabase Auth.
// No manual token headers needed.
async function adminFetch(path: string) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as Record<string,string>).error ?? `GET ${path} → ${res.status}`); }
  return res.json();
}
async function adminMutate(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown) {
  const res = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as Record<string,string>).error ?? `${method} ${path} → ${res.status}`); }
  return res.json();
}

// ── State interface ───────────────────────────────────────────────────────────
interface AdminState {
  isAuthenticated: boolean;
  activeSection: string;
  orders: AdminOrder[];
  products: Product[];
  reviews: AdminReview[];
  exchanges: AdminExchange[];
  categories: Category[];
  coupons: Coupon[];
  heroSlides: HeroSlide[];
  announcements: AnnouncementMsg[];
  customers: { id: string; name: string; email: string; phone: string; city: string; orders: number; totalSpent: number; joined: string; lastOrder: string }[];
  dashboardStats: {
    revenue: number; pending: number; shipped: number; totalOrders: number;
    lowStock: { name: string; size: string; qty: number; productId: string }[];
    pendingReviews: number; pendingExchanges: number; revenueByDay: Record<string, number>;
  } | null;
  loading: Record<string, boolean>;
  toast: { msg: string; type: 'success' | 'error' } | null;
  // auth
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  setSection: (s: string) => void;
  // loaders
  loadDashboard: () => Promise<void>;
  loadOrders: () => Promise<void>;
  loadProducts: () => Promise<void>;
  loadReviews: () => Promise<void>;
  loadExchanges: () => Promise<void>;
  loadCoupons: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadCustomers: () => Promise<void>;
  loadContent: () => Promise<void>;
  // mutations
  updateOrderStatus: (id: string, status: AdminOrder['status'], extra?: { tracking_number?: string; courier?: string; notes?: string }) => Promise<void>;
  toggleProductActive: (id: string) => Promise<void>;
  toggleProductFeatured: (id: string) => Promise<void>;
  updateProductPrice: (id: string, price: number, originalPrice?: number) => Promise<void>;
  updateProductBadge: (id: string, badge: string) => Promise<void>;
  updateVariantStock: (productId: string, variantId: string, qty: number) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  upsertCoupon: (coupon: Partial<Coupon> & { code: string }) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  upsertCategory: (cat: Partial<Category> & { slug: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateExchangeStatus: (id: string, status: AdminExchange['status'], note?: string) => Promise<void>;
  saveContent: (slides: HeroSlide[], announcements: AnnouncementMsg[]) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  clearToast: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAdminStore = create<AdminState>((set, get) => ({
  isAuthenticated: false, activeSection: 'dashboard',
  orders: [], products: [], reviews: [], exchanges: [], categories: [],
  coupons: [], heroSlides: [], announcements: [], customers: [],
  dashboardStats: null, loading: {}, toast: null,

  // ── Auth ────────────────────────────────────────────────────────
  login: async (email, password) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      set({ isAuthenticated: true });
      return true;
    } catch { return false; }
  },
  logout: async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE', credentials: 'same-origin' });
    } catch { /* best-effort */ }
    set({ isAuthenticated: false, activeSection: 'dashboard' });
  },
  checkAuth: async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'same-origin' });
      if (res.ok) set({ isAuthenticated: true });
      else set({ isAuthenticated: false });
    } catch { set({ isAuthenticated: false }); }
  },
  setSection: (s) => set({ activeSection: s }),
  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } });
    setTimeout(() => get().clearToast(), 3500);
  },
  clearToast: () => set({ toast: null }),

  // ── Loaders ─────────────────────────────────────────────────────
  loadDashboard: async () => {
    set(s => ({ loading: { ...s.loading, dashboard: true } }));
    try { set({ dashboardStats: await adminFetch('/api/admin/stats') }); }
    catch (e) { console.error('loadDashboard:', e); }
    set(s => ({ loading: { ...s.loading, dashboard: false } }));
  },

  loadOrders: async () => {
    set(s => ({ loading: { ...s.loading, orders: true } }));
    try { set({ orders: await adminFetch('/api/admin/orders') }); }
    catch (e) { console.error('loadOrders:', e); }
    set(s => ({ loading: { ...s.loading, orders: false } }));
  },

  loadProducts: async () => {
    set(s => ({ loading: { ...s.loading, products: true } }));
    try {
      const raw: Record<string, unknown>[] = await adminFetch('/api/admin/products');
      const products: Product[] = raw.map(p => {
        const variants = ((p.variants as Record<string, unknown>[]) ?? []).map(v => ({
          id: v.id as string,
          product_id: v.product_id as string,
          size: v.size as Product['variants'] extends (infer V)[] ? V extends { size: infer S } ? S : never : never,
          sku: v.sku as string,
        }));
        const inventory = ((p.variants as Record<string, unknown>[]) ?? []).flatMap(v => {
          // Supabase returns inventory as object not array due to UNIQUE on variant_id
          const invRaw = v.inventory;
          const invArr: Record<string, unknown>[] = Array.isArray(invRaw)
            ? invRaw
            : invRaw && typeof invRaw === 'object'
              ? [invRaw as Record<string, unknown>]
              : [];
          return invArr.map(inv => ({
            id: inv.id as string,
            variant_id: (inv.variant_id as string) ?? (v.id as string),
            quantity: inv.quantity as number,
            reserved: inv.reserved as number,
          }));
        });
        const media = ((p.product_media as Record<string, unknown>[]) ?? [])
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map(m => ({
            id: m.id as string,
            product_id: p.id as string,
            url: m.url as string,
            type: (m.type as 'image' | 'video') ?? 'image',
            position: m.position as number,
          }));
        const { variants: _v, product_media: _m, ...rest } = p;
        return { ...(rest as unknown as Product), variants, inventory, media };
      });
      set({ products });
    } catch (e) { console.error('loadProducts:', e); }
    set(s => ({ loading: { ...s.loading, products: false } }));
  },

  loadReviews: async () => {
    set(s => ({ loading: { ...s.loading, reviews: true } }));
    try { set({ reviews: await adminFetch('/api/admin/reviews') }); }
    catch (e) { console.error('loadReviews:', e); }
    set(s => ({ loading: { ...s.loading, reviews: false } }));
  },

  loadExchanges: async () => {
    set(s => ({ loading: { ...s.loading, exchanges: true } }));
    try {
      const raw: Record<string, unknown>[] = await adminFetch('/api/admin/exchanges');
      const exchanges: AdminExchange[] = raw.map(r => ({
        id: r.id as string,
        orderId: r.order_id as string,
        customer: (r.customer as string) ?? '—',
        email: (r.email as string) ?? '—',
        phone: (r.phone as string) ?? '—',
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
      set({ exchanges });
    } catch (e) { console.error('loadExchanges:', e); }
    set(s => ({ loading: { ...s.loading, exchanges: false } }));
  },

  loadCoupons: async () => {
    set(s => ({ loading: { ...s.loading, coupons: true } }));
    try { set({ coupons: await adminFetch('/api/admin/coupons') }); }
    catch (e) { console.error('loadCoupons:', e); }
    set(s => ({ loading: { ...s.loading, coupons: false } }));
  },

  loadCategories: async () => {
    set(s => ({ loading: { ...s.loading, categories: true } }));
    try { set({ categories: await adminFetch('/api/admin/categories') }); }
    catch (e) { console.error('loadCategories:', e); }
    set(s => ({ loading: { ...s.loading, categories: false } }));
  },

  loadCustomers: async () => {
    set(s => ({ loading: { ...s.loading, customers: true } }));
    try { set({ customers: await adminFetch('/api/admin/customers') }); }
    catch (e) { console.error('loadCustomers:', e); }
    set(s => ({ loading: { ...s.loading, customers: false } }));
  },

  loadContent: async () => {
    set(s => ({ loading: { ...s.loading, content: true } }));
    try {
      const { DEFAULT_HERO_SLIDES, DEFAULT_ANNOUNCEMENTS } = await import('@/lib/adminData');
      const data = await adminFetch('/api/admin/content');
      set({
        heroSlides: (data.hero_slides as HeroSlide[]) ?? DEFAULT_HERO_SLIDES,
        announcements: (data.announcements as AnnouncementMsg[]) ?? DEFAULT_ANNOUNCEMENTS,
      });
    } catch (e) { console.error('loadContent:', e); }
    set(s => ({ loading: { ...s.loading, content: false } }));
  },

  // ── Order mutations ──────────────────────────────────────────────
  updateOrderStatus: async (id, status, extra) => {
    try {
      await adminMutate('PATCH', '/api/admin/orders', { id, status, ...extra });
      set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status, ...(extra ?? {}) } : o) }));
      get().showToast('Order updated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed to update order', 'error'); }
  },

  // ── Product mutations ────────────────────────────────────────────
  toggleProductActive: async (id) => {
    const p = get().products.find(p => p.id === id); if (!p) return;
    const is_active = !p.is_active;
    try {
      await adminMutate('PATCH', '/api/admin/products', { id, is_active });
      set(s => ({ products: s.products.map(p => p.id === id ? { ...p, is_active } : p) }));
      get().showToast(is_active ? 'Product activated' : 'Product deactivated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  toggleProductFeatured: async (id) => {
    const p = get().products.find(p => p.id === id); if (!p) return;
    const is_featured = !p.is_featured;
    try {
      await adminMutate('PATCH', '/api/admin/products', { id, is_featured });
      set(s => ({ products: s.products.map(p => p.id === id ? { ...p, is_featured } : p) }));
      get().showToast(is_featured ? 'Marked as featured' : 'Removed from featured');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  updateProductPrice: async (id, price, originalPrice) => {
    try {
      await adminMutate('PATCH', '/api/admin/products', { id, price, original_price: originalPrice ?? null });
      set(s => ({ products: s.products.map(p => p.id === id ? { ...p, price, original_price: originalPrice } : p) }));
      get().showToast('Price updated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  updateProductBadge: async (id, badge) => {
    try {
      await adminMutate('PATCH', '/api/admin/products', { id, badge });
      set(s => ({ products: s.products.map(p => p.id === id ? { ...p, badge: badge || undefined } : p) }));
      get().showToast('Badge updated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  updateVariantStock: async (productId, variantId, qty) => {
    try {
      await adminMutate('PATCH', '/api/admin/products', { id: productId, variantId, quantity: qty });
      set(s => ({
        products: s.products.map(p => {
          if (p.id !== productId) return p;
          const existing = p.inventory ?? [];
          const hasRow = existing.some(inv => inv.variant_id === variantId);
          const updatedInventory = hasRow
            ? existing.map(inv => inv.variant_id === variantId ? { ...inv, quantity: qty } : inv)
            // No inventory row in store yet — add one so the UI reflects the saved value
            : [...existing, { id: variantId, variant_id: variantId, quantity: qty, reserved: 0 }];
          return { ...p, inventory: updatedInventory };
        }),
      }));
      get().showToast('Stock updated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  addProduct: async (product) => {
    try {
      await adminMutate('POST', '/api/admin/products', {
        product: {
          id: product.id, category_id: product.category_id, name: product.name,
          slug: product.slug, tagline: product.tagline, description: product.description,
          price: product.price, original_price: product.original_price ?? null,
          badge: product.badge ?? null, is_featured: product.is_featured,
          is_active: product.is_active, created_at: product.created_at,
        },
        variants: product.variants ?? [],
        inventory: (product.inventory ?? []).map(inv => ({
          variant_id: inv.variant_id, quantity: inv.quantity, reserved: inv.reserved,
        })),
        media: (product.media ?? []).map(m => m.url),
      });
      set(s => ({ products: [product, ...s.products] }));
      get().showToast('Product added');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed to add product', 'error'); }
  },

  deleteProduct: async (id) => {
    try {
      await adminMutate('DELETE', '/api/admin/products', { id });
      set(s => ({ products: s.products.filter(p => p.id !== id) }));
      get().showToast('Product deleted');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  // ── Review mutations ─────────────────────────────────────────────
  approveReview: async (id) => {
    try {
      await adminMutate('PATCH', '/api/admin/reviews', { id, approved: true });
      set(s => ({ reviews: s.reviews.map(r => r.id === id ? { ...r, approved: true } : r) }));
      get().showToast('Review approved');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  deleteReview: async (id) => {
    try {
      await adminMutate('DELETE', '/api/admin/reviews', { id });
      set(s => ({ reviews: s.reviews.filter(r => r.id !== id) }));
      get().showToast('Review deleted');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  // ── Coupon mutations ─────────────────────────────────────────────
  upsertCoupon: async (coupon) => {
    try {
      await adminMutate('POST', '/api/admin/coupons', coupon);
      await get().loadCoupons();
      get().showToast('Coupon saved');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  deleteCoupon: async (id) => {
    try {
      await adminMutate('DELETE', '/api/admin/coupons', { id });
      set(s => ({ coupons: s.coupons.filter(c => c.id !== id) }));
      get().showToast('Coupon deleted');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  // ── Category mutations ───────────────────────────────────────────
  upsertCategory: async (cat) => {
    try {
      await adminMutate('POST', '/api/admin/categories', cat);
      await get().loadCategories();
      get().showToast('Category saved');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  deleteCategory: async (id) => {
    try {
      await adminMutate('DELETE', '/api/admin/categories', { id });
      set(s => ({ categories: s.categories.filter(c => c.id !== id) }));
      get().showToast('Category deleted');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  // ── Exchange mutations ───────────────────────────────────────────
  updateExchangeStatus: async (id, status, note) => {
    try {
      await adminMutate('PATCH', '/api/admin/exchanges', { id, status, admin_note: note });
      set(s => ({
        exchanges: s.exchanges.map(e =>
          e.id === id ? { ...e, status, ...(note !== undefined ? { adminNote: note } : {}) } : e
        ),
      }));
      get().showToast('Exchange updated');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed', 'error'); }
  },

  // ── Content mutations ────────────────────────────────────────────
  saveContent: async (slides, announcements) => {
    try {
      await Promise.all([
        adminMutate('POST', '/api/admin/content', { key: 'hero_slides', value: slides }),
        adminMutate('POST', '/api/admin/content', { key: 'announcements', value: announcements }),
      ]);
      set({ heroSlides: slides, announcements });
      get().showToast('Content saved');
    } catch (e: unknown) { get().showToast(e instanceof Error ? e.message : 'Failed to save content', 'error'); }
  },
}));