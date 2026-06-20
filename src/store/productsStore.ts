'use client';

import { create } from 'zustand';
import type { Product, Category } from '@/types';

interface ProductsState {
  products: Product[];
  categories: Category[];
  loaded: boolean;
  loadedAt: number;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  getByCategory: (categoryId: string) => Product[];
  getBySlug: (slug: string) => Product | undefined;
  getByIds: (ids: string[]) => Product[];
  search: (query: string) => Product[];
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  loaded: false,
  loadedAt: 0,
  loading: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    // Revalidate if data is older than 5 minutes
    const stale = Date.now() - (get().loadedAt ?? 0) > 5 * 60 * 1000;
    if (get().loaded && !stale) return;
    set({ loading: true, error: null });
    try {
      const { fetchProducts, fetchCategories } = await import('@/lib/db');
      const [products, categories] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      set({ products, categories, loaded: true, loadedAt: Date.now(), loading: false });
    } catch (err) {
      console.error('productsStore.load failed:', err);
      set({
        error: 'Failed to load products. Please refresh the page.',
        loading: false,
        loaded: true, // prevent infinite retry loops
      });
    }
  },

  getByCategory: (categoryId) =>
    get().products.filter((p) => p.category_id === categoryId && p.is_active),

  getBySlug: (slug) =>
    get().products.find((p) => p.slug === slug),

  getByIds: (ids) =>
    ids.map((id) => get().products.find((p) => p.id === id)).filter(Boolean) as Product[],

  search: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return get().products.filter(
      (p) =>
        p.is_active &&
        (p.name.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.badge?.toLowerCase().includes(q))
    );
  },
}));
