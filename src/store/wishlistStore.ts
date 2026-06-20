'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  productIds: string[];
  synced: boolean;

  toggle: (productId: string) => void;
  has: (productId: string) => boolean;

  // Sync with Supabase for authenticated users
  syncFromSupabase: (userId: string) => Promise<void>;
  toggleWithSync: (productId: string, userId?: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      synced: false,

      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),

      has: (productId) => get().productIds.includes(productId),

      syncFromSupabase: async (userId: string) => {
        if (get().synced) return;
        try {
          const { fetchWishlistProductIds } = await import('@/lib/db');
          const ids = await fetchWishlistProductIds(userId);
          // Merge: keep any local ids that aren't in remote yet
          const localIds = get().productIds;
          const merged = [...new Set([...ids, ...localIds])];
          set({ productIds: merged, synced: true });

          // Push any local-only ids to Supabase
          const { addToWishlist } = await import('@/lib/db');
          const newIds = localIds.filter((id) => !ids.includes(id));
          await Promise.all(newIds.map((id) => addToWishlist(userId, id)));
        } catch (err) {
          console.error('wishlist sync failed:', err);
        }
      },

      toggleWithSync: async (productId: string, userId?: string) => {
        const { has } = get();
        const isIn = has(productId);

        // Optimistic local update
        set((state) => ({
          productIds: isIn
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        }));

        // Sync to Supabase if user is logged in
        if (userId) {
          try {
            if (isIn) {
              const { removeFromWishlist } = await import('@/lib/db');
              await removeFromWishlist(userId, productId);
            } else {
              const { addToWishlist } = await import('@/lib/db');
              await addToWishlist(userId, productId);
            }
          } catch (err) {
            console.error('wishlist toggleWithSync failed:', err);
            // Revert on failure
            set((state) => ({
              productIds: !isIn
                ? state.productIds.filter((id) => id !== productId)
                : [...state.productIds, productId],
            }));
          }
        }
      },
    }),
    { name: 'rareease-wishlist' }
  )
);
