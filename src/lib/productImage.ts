/**
 * productImage.ts — Single source of truth for product image resolution.
 *
 * Priority:
 *   1. product.media from Supabase (uploaded via admin panel)
 *   2. PRODUCT_PHOTO_MAP fallback (legacy hardcoded images)
 *   3. null (show placeholder)
 */

import { PRODUCT_PHOTO_MAP } from '@/lib/productPhotos';
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

/** Resolve images for a product — DB media first, legacy fallback second */
export function getProductImages(product: Product): ProductImages {
  // 1. Use product_media from DB if available
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

  // 2. Fallback to static PRODUCT_PHOTO_MAP
  const photos = PRODUCT_PHOTO_MAP[product.id];
  if (photos) {
    const all = [photos.img, photos.img2].filter(Boolean) as string[];
    const slides: ProductImageSlide[] = all.map((src, i) => ({
      src,
      alt:   `${product.name} — ${i === 0 ? 'front' : 'back'} view`,
      label: `Image ${i + 1} of ${all.length}`,
    }));
    return {
      primary:   photos.img ?? null,
      secondary: photos.img2 ?? null,
      all,
      slides,
    };
  }

  // 3. No images
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
