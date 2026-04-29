'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';

export default function FeaturedProduct() {
  const [size, setSize]   = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const { addItem, openCart }  = useCartStore();
  const { addToast, openProductOverlay } = useUIStore();
  const { toggleWithSync, has }           = useWishlistStore();
  const { products }                       = useProductsStore();

  const product    = products.find(p => p.is_featured && p.is_active) ?? products.find(p => p.is_active);
  if (!product) return null;

  const isWishlisted = has(product.id);
  const imgs         = getProductImages(product);
  const activeImg    = imgs.slides[imgIdx];

  const addToCart = () => {
    if (!size) { addToast('⚠', 'Please select a size'); return; }
    const variant = product.variants?.find(v => v.size === size);
    if (!variant) return;
    addItem({ productId: product.id, variantId: variant.id, name: product.name, price: product.price, size, quantity: 1, slug: product.slug, image: imgs.primary ?? undefined });
    addToast('✓', `${product.name} (${size}) added`);
    openCart();
  };

  return (
    <section className="feat-section" id="featured">
      <div className="feat-label-row">
        <div className="section-label">Drop 01</div>
        <div className="feat-tag">Featured</div>
      </div>

      {/* Main image */}
      <div className="feat-img-wrap" onClick={() => openProductOverlay(product)}>
        <div className="feat-img" style={{ position: 'relative', background: '#111', overflow: 'hidden' }}>
          {activeImg ? (
            <Image
              src={activeImg.src}
              alt={activeImg.alt}
              fill
              sizes="(max-width:768px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'top center' }}
              priority
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg,#1a1a1a,#0a0a0a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-display)' }}>
                {getProductInitials(product)}
              </span>
            </div>
          )}

          <button
            className={`feat-wish${isWishlisted ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); toggleWithSync(product.id); addToast(isWishlisted ? '♡' : '♥', isWishlisted ? 'Removed' : 'Wishlisted'); }}
            aria-label="Wishlist"
          >
            {isWishlisted ? '♥' : '♡'}
          </button>

          {product.original_price && (
            <div className="feat-sale-badge">
              {Math.round((1 - product.price / product.original_price) * 100)}% OFF
            </div>
          )}

          {imgs.slides.length > 1 && (
            <div className="feat-view-label">{imgIdx + 1} / {imgs.slides.length}</div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {imgs.slides.length > 1 && (
        <div className="feat-thumbs">
          {imgs.slides.map((slide, i) => (
            <button
              key={i}
              className={`feat-thumb${imgIdx === i ? ' active' : ''}`}
              onClick={() => setImgIdx(i)}
              style={{ position: 'relative', overflow: 'hidden', background: '#111' }}
            >
              <Image src={slide.src} alt={slide.alt} fill sizes="60px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="feat-info">
        <div className="feat-name">{product.name}</div>
        <div className="feat-tagline">{product.tagline}</div>

        <div className="feat-price-row">
          <span className="feat-price">{formatPrice(product.price)}</span>
          {product.original_price && (
            <del className="feat-orig">{formatPrice(product.original_price)}</del>
          )}
        </div>

        <div className="feat-sizes-label">Select Size</div>
        <div className="feat-sizes">
          {product.variants?.map(v => {
            const inv = product.inventory?.find(i => i.variant_id === v.id);
            const qty = inv ? inv.quantity - inv.reserved : 0;
            const oos = qty <= 0;
            const lowStock = qty > 0 && qty <= 3;
            return (
              <button
                key={v.id}
                className={`feat-size-btn${size === v.size ? ' active' : ''}${oos ? ' feat-size-btn--oos' : ''}`}
                onClick={() => !oos && setSize(v.size)}
                disabled={oos}
                title={oos ? 'Out of stock' : lowStock ? `Only ${qty} left!` : v.size}
                style={{ position: 'relative' }}
              >
                {v.size}
                {lowStock && !oos && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--blush)', border: '1px solid var(--black)',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        <div className="feat-cta-row">
          <button className="feat-add-btn" onClick={addToCart}>Add to Cart</button>
          <button className="feat-view-btn" onClick={() => openProductOverlay(product)}>Full Details</button>
        </div>
      </div>
    </section>
  );
}
