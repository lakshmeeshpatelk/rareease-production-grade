'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice } from '@/lib/utils';

const VIEWS = ['Front', 'Back', 'Detail', 'Side'];
const GRADS = [
  'linear-gradient(160deg,#1a1a1a,#0a0a0a)',
  'linear-gradient(140deg,#111,#1c1c1c)',
  'linear-gradient(120deg,#0d0d0d,#181818)',
  'linear-gradient(150deg,#131313,#0a0a0a)',
];

export default function FeaturedProduct() {
  const [size, setSize] = useState('');
  const [view, setView] = useState(0);
  const { addItem, openCart } = useCartStore();
  const { addToast, openProductOverlay } = useUIStore();
  const { toggleWithSync, has } = useWishlistStore();
  const { products } = useProductsStore();

  // Use first featured product, or first active product as fallback
  const product = products.find(p => p.is_featured && p.is_active) ?? products.find(p => p.is_active);
  if (!product) return null;
  const isWishlisted = has(product.id);

  const addToCart = () => {
    if (!size) { addToast('⚠', 'Please select a size'); return; }
    const variant = product.variants?.find(v => v.size === size);
    if (!variant) return;
    addItem({ productId: product.id, variantId: variant.id, name: product.name, price: product.price, size, quantity: 1, slug: product.slug });
    addToast('✓', `${product.name} (${size}) added`);
    openCart();
  };

  return (
    <section className="feat-section" id="featured">
      <div className="feat-label-row">
        <div className="section-label">Drop 01</div>
        <div className="feat-tag">Featured</div>
      </div>

      {/* Image — big, tap to open overlay */}
      <div className="feat-img-wrap" onClick={() => openProductOverlay(product)}>
        <div className="feat-img" style={{ background: GRADS[view] }}>
          <span className="feat-img-initials">
            {product.name.split(' ').map((w: string) => w[0]).join('')}
          </span>
        </div>

        {/* Wish btn on image */}
        <button
          className={`feat-wish${isWishlisted ? ' active' : ''}`}
          onClick={e => { e.stopPropagation(); toggleWithSync(product.id); addToast(isWishlisted ? '♡' : '♥', isWishlisted ? 'Removed' : 'Wishlisted'); }}
          aria-label="Wishlist"
        >
          {isWishlisted ? '♥' : '♡'}
        </button>

        {/* Sale badge */}
        {product.original_price && (
          <div className="feat-sale-badge">
            {Math.round((1 - product.price / product.original_price) * 100)}% OFF
          </div>
        )}

        {/* View label */}
        <div className="feat-view-label">{VIEWS[view]}</div>
      </div>

      {/* Thumb strip */}
      <div className="feat-thumbs">
        {GRADS.map((g, i) => (
          <button
            key={i}
            className={`feat-thumb${view === i ? ' active' : ''}`}
            style={{ background: g }}
            onClick={() => setView(i)}
          >
            <span style={{ fontSize: 8, color: view === i ? 'var(--sage)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </button>
        ))}
      </div>

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

        {/* Size selector */}
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

        {/* CTA */}
        <div className="feat-cta-row">
          <button className="feat-add-btn" onClick={addToCart}>Add to Cart</button>
          <button className="feat-view-btn" onClick={() => openProductOverlay(product)}>Full Details</button>
        </div>
      </div>
    </section>
  );
}
