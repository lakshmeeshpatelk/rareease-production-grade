/**
 * productImage.ts — Single source of truth for product image resolution.
 * Uses product.media from Supabase (uploaded via admin panel).
 */

import type { Product, ProductMedia } from '@/types';

export interface ProductImageSlide {
  src:   string;
  alt:   string;
  label: string; // "Image 1 of 4" etc.
}

export interface ProductImages {
  primary:    string | null;          // main / front image URL
  secondary:  string | null;          // hover / back image URL
  all:        string[];               // all URLs in order
  slides:     ProductImageSlide[];    // enriched slides with alt text
}

/** Resolve images for a product — DB media only */
export function getProductImages(product: Product): ProductImages {
  const media = (product.media ?? []).sort(
    (a: ProductMedia, b: ProductMedia) => a.position - b.position,
  );

  if (media.length > 0) {
    const all = media.map((m: ProductMedia) => m.url);
    const slides: ProductImageSlide[] = media.map((m: ProductMedia, i: number) => ({
      src:   m.url,
      alt:   m.alt_text ?? `${product.name} — image ${i + 1} of ${media.length}`,
      label: `Image ${i + 1} of ${media.length}`,
    }));
    return {
      primary:   media[0]?.url ?? null,
      secondary: media[1]?.url ?? null,
      all,
      slides,
    };
  }

  return { primary: null, secondary: null, all: [], slides: [] };
}

/** Get just the primary image URL or null */
export function getPrimaryImage(product: Product): string | null {
  return getProductImages(product).primary;
}

/** Get initials placeholder text for a product */
export function getProductInitials(product: Product): string {
  return product.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}