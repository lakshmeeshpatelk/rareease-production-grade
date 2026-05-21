'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, getInventoryForVariant } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import type { Product } from '@/types';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { openProductOverlay, addToast } = useUIStore();
  const { addItem, openCart } = useCartStore();
  const [hovered, setHovered] = useState(false);

  const imgs = getProductImages(product);
  const hasPhoto = !!imgs.primary;

  const handleQuickAdd = (e: React.MouseEvent, size: string) => {
    e.stopPropagation();
    const variant = product.variants?.find(v => v.size === size);
    if (!variant) { openProductOverlay(product); return; }
    const available = getInventoryForVariant(product, variant.id);
    if (available <= 0) { addToast('✕', `${size} is out of stock`); return; }
    const imgs = getProductImages(product);
    addItem({ productId: product.id, variantId: variant.id, name: product.name, price: product.price, size, quantity: 1, slug: product.slug, image: imgs.primary ?? undefined });
    addToast('✓', `${product.name} (${size}) added to cart`);
    openCart();
  };

  return (
    <div className="pc-card" onClick={() => openProductOverlay(product)}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="pc-img-wrap">
        {hasPhoto ? (
          <>
            <Image
              src={imgs.primary!}
              alt={product.name}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
              className={`pc-img${hovered && imgs.secondary ? ' pc-img--hide' : ''}`}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
            {imgs.secondary && (
              <Image
                src={imgs.secondary!}
                alt={product.name}
                fill
                sizes="(max-width:768px) 50vw, 25vw"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                className={`pc-img pc-img--alt${hovered ? ' pc-img--show' : ''}`}
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="pc-img-placeholder">
            <div className="pc-img-grid" />
            <span className="pc-img-initials">{getProductInitials(product)}</span>
          </div>
        )}
        {product.badge && (
          <div className={`pc-badge pc-badge--${product.badge.toLowerCase().replace(' ', '-')}`}>
            {product.badge}
          </div>
        )}
        <div className={`pc-quick-add${hovered ? ' pc-quick-add--show' : ''}`}>
          <span className="pc-quick-add-label">Quick Add</span>
          <div className="pc-quick-sizes">
            {SIZES.map(s => {
              const variant = product.variants?.find(v => v.size === s);
              const inStock = variant ? getInventoryForVariant(product, variant.id) > 0 : false;
              return (
                <button key={s}
                  className={`pc-quick-size${!inStock ? ' oos' : ''}`}
                  onClick={e => handleQuickAdd(e, s)}
                  title={!inStock ? 'Out of stock' : undefined}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pc-info">
        <div className="pc-name">{product.name}</div>
        <div className="pc-price-row">
          <span className="pc-price">{formatPrice(product.price)}</span>
          {product.original_price && (
            <>
              <del className="pc-orig">{formatPrice(product.original_price)}</del>
              <span className="pc-discount">
                {Math.round((1 - product.price / product.original_price) * 100)}% off
              </span>
            </>
          )}
        </div>
        <div className="pc-size-dots">
          {SIZES.map(s => <span key={s} className="pc-size-dot">{s}</span>)}
        </div>
      </div>
    </div>
  );
}

function HomepageCuratedGrid() {
  const { products: allProducts, load, loading } = useProductsStore();
  const { openFullCollection } = useUIStore();

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const curatedProducts = allProducts
    .filter(p => p.is_active && p.homepage_featured)
    .sort((a, b) => (a.homepage_sort_order ?? 9999) - (b.homepage_sort_order ?? 9999))
    .slice(0, 60);

  const displayProducts = curatedProducts.length > 0
    ? curatedProducts
    : allProducts.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60);

  return (
    <div className="sg-section" id="our-picks">
      <div className="sh-row">
        <div className="sh-left">
          <span className="sh-eyebrow">Admin Curated</span>
          <h2 className="sh-title">Our Picks</h2>
        </div>
        <button className="sh-view-all" onClick={openFullCollection}>View All →</button>
      </div>

      <div className="sg-grid-2col">
        {loading && displayProducts.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pc-card pc-card--skeleton">
                <div className="pc-img-wrap pc-skeleton-img" />
                <div className="pc-info">
                  <div className="pc-skeleton-line pc-skeleton-line--name" />
                  <div className="pc-skeleton-line pc-skeleton-line--price" />
                </div>
              </div>
            ))
          : displayProducts.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 6} />)
        }
      </div>
    </div>
  );
}

export default function ShopGrid() {
  const { load } = useProductsStore();
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sg-root" id="shop">

      {/* ── 6 admin-curated products, single "View All" opens overlay ── */}
      <HomepageCuratedGrid />

      {/* ── MARQUEE ── */}
      <div className="sg-marquee" aria-hidden>
        <div className="sg-marquee-track">
          {['WEAR THE RARE', '✦', 'STREET CORE', '✦', 'SS25', '✦', 'FEEL THE EASE', '✦',
            'PREMIUM GSM', '✦', 'INDIA MADE', '✦', 'WEAR THE RARE', '✦', 'STREET CORE', '✦',
            'SS25', '✦', 'FEEL THE EASE', '✦', 'PREMIUM GSM', '✦', 'INDIA MADE', '✦'].map((t, i) => (
            <span key={i} className="sg-marquee-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ── TRUST STRIP ── */}
      <div className="sg-trust-strip">
        <div className="sg-trust-item">
          <span className="sg-trust-num">240 GSM</span>
          <span className="sg-trust-label">Min. Fabric</span>
        </div>
        <div className="sg-trust-divider" />
        <div className="sg-trust-item">
          <span className="sg-trust-num">India</span>
          <span className="sg-trust-label">Made</span>
        </div>
      </div>

    </div>
  );
}