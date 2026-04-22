/**
 * utils.ts — Pure UI helpers
 * Extracted here so that client components do not pull large data files
 * 150-product mock dataset into their bundles just to format a price.
 */

import type { Product } from '@/types';

// ── Price formatter ────────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// ── Category gradient map ──────────────────────────────────────────────────────

export const CAT_GRADIENTS: Record<string, string[]> = {
  'cat-1': [
    'linear-gradient(135deg,#d4cfc8,#c0bab2)',
    'linear-gradient(160deg,#cbc5bd,#b5afa7)',
    'linear-gradient(120deg,#c8c2ba,#bdb7af)',
    'linear-gradient(145deg,#d0cac2,#c5bfb7)',
    'linear-gradient(130deg,#d6d0c9,#c3bdb5)',
  ],
  'cat-2': [
    'linear-gradient(135deg,#e8d5c4,#d4c0ae)',
    'linear-gradient(160deg,#e0ccba,#ccb8a6)',
    'linear-gradient(120deg,#ddd0be,#c9bba9)',
    'linear-gradient(145deg,#e4d2c0,#d0bcaa)',
    'linear-gradient(130deg,#ead8c7,#d6c2b0)',
  ],
  'cat-3': [
    'linear-gradient(135deg,#c8d4cc,#b4c0b8)',
    'linear-gradient(160deg,#c0ccC5,#acb8b1)',
    'linear-gradient(120deg,#bec9c2,#aab5ae)',
    'linear-gradient(145deg,#cad6ce,#b6c2ba)',
    'linear-gradient(130deg,#ccd8d0,#b8c4bc)',
  ],
  'cat-4': [
    'linear-gradient(135deg,#d4cce0,#c0b8cc)',
    'linear-gradient(160deg,#ccc4d8,#b8b0c4)',
    'linear-gradient(120deg,#cac2d6,#b6aec2)',
    'linear-gradient(145deg,#d6ceE2,#c2bacc)',
    'linear-gradient(130deg,#d8d0e4,#c4bcce)',
  ],
  'cat-5': [
    'linear-gradient(135deg,#d0ccc4,#bcb8b0)',
    'linear-gradient(160deg,#c8c4bc,#b4b0a8)',
    'linear-gradient(120deg,#c6c2ba,#b2aea6)',
    'linear-gradient(145deg,#d2cec6,#bebab2)',
    'linear-gradient(130deg,#d4d0c8,#c0bcb4)',
  ],
  'cat-6': [
    'linear-gradient(135deg,#dcd0c4,#c8bcb0)',
    'linear-gradient(160deg,#d4c8bc,#c0b4a8)',
    'linear-gradient(120deg,#d2c6ba,#beb2a6)',
    'linear-gradient(145deg,#ded2c6,#cabeb2)',
    'linear-gradient(130deg,#e0d4c8,#ccc0b4)',
  ],
};

// ── Inventory helper ───────────────────────────────────────────────────────────

export function getInventoryForVariant(product: Product, variantId: string): number {
  const inv = product.inventory?.find((i) => i.variant_id === variantId);
  return inv ? inv.quantity - inv.reserved : 0;
}
