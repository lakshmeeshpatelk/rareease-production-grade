/**
 * Maps product IDs to their available photo paths.
 * img  = primary (front) photo
 * img2 = secondary (back / alt) photo
 *
 * Add more entries here as new product photos are added to /public/products/
 */
export const PRODUCT_PHOTO_MAP: Record<string, { img: string; img2?: string }> = {
  // Women's Oversized
  'wos-01': { img: '/products/women-combo-1.jpg',    img2: '/products/women-tee-back-1.jpg' },
  'wos-02': { img: '/products/women-tee-back-1.jpg', img2: '/products/women-combo-1.jpg'    },
  'wos-03': { img: '/products/women-tee-back-2.jpg', img2: '/products/women-combo-2.jpg'    },
  'wos-04': { img: '/products/women-combo-2.jpg',    img2: '/products/women-tee-back-2.jpg' },

  // Men's Oversized
  'mos-01': { img: '/products/men-tee-1.jpg', img2: '/products/men-tee-2.jpg' },
  'mos-02': { img: '/products/men-tee-2.jpg', img2: '/products/men-tee-1.jpg' },

  // Combos
  'mc-01':  { img: '/products/men-tee-1.jpg' },
  'wc-01':  { img: '/products/women-combo-1.jpg', img2: '/products/women-combo-2.jpg' },
};
