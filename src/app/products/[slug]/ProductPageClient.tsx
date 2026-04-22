'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { CATEGORIES } from '@/lib/categories';
import type { Product } from '@/types';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

function getInventoryQty(product: Product, variantId: string): number {
  return product.inventory?.find(i => i.variant_id === variantId)?.quantity ?? 0;
}

export default function ProductPageClient({ product }: { product: Product }) {
  const { addItem, openCart } = useCartStore();
  const { addToast, openProductOverlay } = useUIStore();
  const { toggleWithSync, has } = useWishlistStore();
  const { products: allProducts } = useProductsStore();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [imgIdx, setImgIdx] = useState(0);

  const imgs     = getProductImages(product);
  const images   = imgs.all;
  const category = CATEGORIES.find(c => c.id === product.category_id);
  const isWishlisted = has(product.id);

  // Related products — same category, different product, from store with fallback
  const related = (allProducts.length > 0 ? allProducts : [])
    .filter(p => p.category_id === product.category_id && p.id !== product.id && p.is_active)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (!selectedSize) { addToast('⚠', 'Please select a size'); return; }
    const variant = product.variants?.find(v => v.size === selectedSize);
    if (!variant) return;
    const qty = getInventoryQty(product, variant.id);
    if (qty === 0) { addToast('✕', 'This size is out of stock'); return; }
    addItem({ productId: product.id, variantId: variant.id, name: product.name, price: product.price, size: selectedSize, quantity: 1, slug: product.slug });
    addToast('✓', `${product.name} (${selectedSize}) added to cart`);
    openCart();
  };

  // JSON-LD structured data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://rareease.com';
  const productUrl = `${appUrl}/products/${product.slug}`;
  const inStock = product.inventory?.some((i: any) => i.quantity > 0);
  const productImages = imgs.all.length > 0 ? imgs.all : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        description: product.description ?? product.tagline,
        brand: { '@type': 'Brand', name: 'Rare Ease' },
        url: productUrl,
        ...(productImages && { image: productImages }),
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'INR',
          availability: inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: productUrl,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          seller: { '@type': 'Organization', name: 'Rare Ease', url: appUrl },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 7,
            returnMethod: 'https://schema.org/ReturnByMail',
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              businessDays: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
              handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
              transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
            },
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
          ...(category ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${appUrl}/collections/${category.slug}` }] : []),
          { '@type': 'ListItem', position: category ? 3 : 2, name: product.name, item: productUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pp-root">
        {/* ── Navbar strip ─── */}
        <nav className="pp-topbar">
          <Link href="/" className="pp-logo">RARE EASE</Link>
          <div className="pp-breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            {category && <Link href={`/collections/${category.slug}`}>{category.name}</Link>}
            <span>›</span>
            <span>{product.name}</span>
          </div>
          <button className="pp-cart-btn" onClick={openCart}>Cart →</button>
        </nav>

        {/* ── Product layout ─── */}
        <div className="pp-layout">
          {/* Images */}
          <div className="pp-images">
            <div className="pp-main-img">
              {images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[imgIdx]} alt={product.name} />
              ) : (
                <div className="pp-img-placeholder">
                  <span>{getProductInitials(product)}</span>
                </div>
              )}
              {product.badge && <div className="pp-badge">{product.badge}</div>}
            </div>
            {images.length > 1 && (
              <div className="pp-thumbs">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`${product.name} ${i + 1}`}
                    className={`pp-thumb${imgIdx === i ? ' active' : ''}`}
                    onClick={() => setImgIdx(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="pp-details">
            {category && <div className="pp-category">{category.name}</div>}
            <h1 className="pp-title">{product.name}</h1>
            {product.tagline && <p className="pp-tagline">{product.tagline}</p>}

            {/* Price */}
            <div className="pp-price-row">
              <span className="pp-price">{formatPrice(product.price)}</span>
              {product.original_price && (
                <>
                  <del className="pp-orig">{formatPrice(product.original_price)}</del>
                  <span className="pp-discount">
                    {Math.round((1 - product.price / product.original_price) * 100)}% off
                  </span>
                </>
              )}
            </div>

            {/* Size selector */}
            <div className="pp-size-section">
              <div className="pp-size-label">
                Size {selectedSize && <span className="pp-size-selected">— {selectedSize}</span>}
              </div>
              <div className="pp-sizes">
                {SIZES.map(s => {
                  const variant = product.variants?.find(v => v.size === s);
                  const qty     = variant ? getInventoryQty(product, variant.id) : 0;
                  const oos     = qty === 0;
                  return (
                    <button key={s}
                      className={`pp-size-btn${selectedSize === s ? ' active' : ''}${oos ? ' oos' : ''}`}
                      onClick={() => !oos && setSelectedSize(s)}
                      disabled={oos}
                      title={oos ? 'Out of stock' : undefined}
                    >
                      {s}
                      {oos && <span className="pp-size-oos-line" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="pp-ctas">
              <button className="pp-add-btn" onClick={handleAddToCart}>
                Add to Cart
              </button>
              <button
                className={`pp-wish-btn${isWishlisted ? ' wishlisted' : ''}`}
                onClick={() => toggleWithSync(product.id)}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isWishlisted ? '♥' : '♡'}
              </button>
            </div>

            {/* Info strips */}
            <div className="pp-strips">
              <div className="pp-strip">🚚 Free shipping pan India</div>
              <div className="pp-strip">📦 Dispatched within 24 hours</div>
              <div className="pp-strip">🔄 Exchange within 48hrs of delivery</div>
              <div className="pp-strip">🇮🇳 Made in India · 240 GSM min. fabric</div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="pp-desc">
                <div className="pp-desc-title">About this piece</div>
                <p>{product.description}</p>
              </div>
            )}

            {/* View full details */}
            <button
              className="pp-overlay-link"
              onClick={() => openProductOverlay(product)}
            >
              View Size Guide & Reviews ↗
            </button>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className="pp-related">
            <div className="pp-related-title">You May Also Like</div>
            <div className="pp-related-grid">
              {related.map(p => {
                const rImgs = getProductImages(p);
                return (
                  <Link key={p.id} href={`/products/${p.slug}`} className="pp-related-card">
                    <div className="pp-related-img">
                      {rImgs.primary ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={rImgs.primary} alt={p.name} />
                      ) : (
                        <div className="pp-related-placeholder">
                          {getProductInitials(p)}
                        </div>
                      )}
                    </div>
                    <div className="pp-related-name">{p.name}</div>
                    <div className="pp-related-price">{formatPrice(p.price)}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Back to shop */}
        <div className="pp-back">
          <Link href="/#shop">← Back to Shop</Link>
        </div>
      </div>
    </>
  );
}
