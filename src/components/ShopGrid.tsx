'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, getInventoryForVariant } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { CATEGORIES } from '@/lib/categories';
import type { Product } from '@/types';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const TOP_SELLERS_IDS = ['mos-08', 'wos-05', 'msl-02', 'wsl-02'];

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
            <Image src={imgs.primary!} alt={product.name} fill sizes="(max-width:768px) 50vw, 25vw" style={{ objectFit: 'cover' }}
              className={`pc-img${hovered && imgs.secondary ? ' pc-img--hide' : ''}`}
              loading={priority ? 'eager' : 'lazy'} />
            {imgs.secondary && (
              <Image src={imgs.secondary!} alt={product.name} fill sizes="(max-width:768px) 50vw, 25vw" style={{ objectFit: 'cover' }}
                className={`pc-img pc-img--alt${hovered ? ' pc-img--show' : ''}`}
                loading="lazy" />
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

function SectionHeader({ title, label, useFullCollection = false }: {
  title: string; label?: string; useFullCollection?: boolean;
}) {
  const { openFullCollection } = useUIStore();
  return (
    <div className="sh-row">
      <div className="sh-left">
        {label && <span className="sh-eyebrow">{label}</span>}
        <h2 className="sh-title">{title}</h2>
      </div>
      {useFullCollection && (
        <button className="sh-view-all" onClick={openFullCollection}>View All →</button>
      )}
    </div>
  );
}

// ── Homepage Curated Grid ──────────────────────────────────────────
// Shows ONLY admin-selected homepage_featured products (up to 60),
// in the order the admin set. No filters, no sort — clean & locked.
function HomepageCuratedGrid() {
  const { products: allProducts, load, loading } = useProductsStore();
  const { openFullCollection } = useUIStore();

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const curatedProducts = allProducts
    .filter(p => p.is_active && p.homepage_featured)
    .sort((a, b) => (a.homepage_sort_order ?? 9999) - (b.homepage_sort_order ?? 9999))
    .slice(0, 60);

  // Fallback: if admin hasn't curated anything yet, show most recent active products
  const displayProducts = curatedProducts.length > 0
    ? curatedProducts
    : allProducts.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);

  const isCurated = curatedProducts.length > 0;

  return (
    <div className="sg-section" id="our-picks">
      <div className="sh-row">
        <div className="sh-left">
          <span className="sh-eyebrow">{isCurated ? 'Our Picks' : 'Collection'}</span>
          <h2 className="sh-title">{isCurated ? 'Featured' : 'All Products'}</h2>
        </div>
        <button className="sh-view-all" onClick={openFullCollection}>
          View All →
        </button>
      </div>

      {loading && allProducts.length === 0 ? (
        <div className="sg-grid-2col">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pc-card pc-card--skeleton">
              <div className="pc-img-wrap pc-skeleton-img" />
              <div className="pc-info">
                <div className="pc-skeleton-line pc-skeleton-line--name" />
                <div className="pc-skeleton-line pc-skeleton-line--price" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sg-grid-2col">
          {displayProducts.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
      )}

      {/* View full collection CTA */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={openFullCollection}
          className="sh-view-all"
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.12em',
            padding: '0.75rem 2rem',
            border: '1px solid var(--white)',
            borderRadius: '2px',
            background: 'transparent',
            color: 'var(--white)',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--black)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--white)';
          }}
        >
          EXPLORE FULL COLLECTION
        </button>
      </div>
    </div>
  );
}

export default function ShopGrid() {
  const { products, load, getByIds } = useProductsStore();
  const { categories } = useProductsStore();
  const cats = categories.length > 0 ? categories : CATEGORIES;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New Arrivals: products with badge='New' first, then fallback to 8 most recent active products
  const newArrivalsTagged = products.filter(p => p.is_active && (p.badge === 'New' || p.badge === 'NEW'));
  const displayNewArrivals = newArrivalsTagged.length >= 4
    ? newArrivalsTagged.slice(0, 8)
    : products.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

  // Top Sellers: try known IDs first, fallback to is_featured products
  const topSellersById = getByIds(TOP_SELLERS_IDS).filter(p => p.is_active);
  const displayTopSellers = topSellersById.length > 0
    ? topSellersById
    : products.filter(p => p.is_active && p.is_featured).slice(0, 4);

  return (
    <div className="sg-root" id="shop">

      {/* ── NEW ARRIVALS ── */}
      <div className="sg-section">
        <SectionHeader title="New Arrivals" label="SS25" />
        <div className="sg-grid-2col">
          {displayNewArrivals.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}
        </div>
      </div>

      {/* ── INNER MARQUEE ── */}
      <div className="sg-marquee" aria-hidden>
        <div className="sg-marquee-track">
          {['WEAR THE RARE', '✦', 'STREET CORE', '✦', 'SS25', '✦', 'FEEL THE EASE', '✦',
            'PREMIUM GSM', '✦', 'INDIA MADE', '✦', 'WEAR THE RARE', '✦', 'STREET CORE', '✦',
            'SS25', '✦', 'FEEL THE EASE', '✦', 'PREMIUM GSM', '✦', 'INDIA MADE', '✦'].map((t, i) => (
            <span key={i} className="sg-marquee-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ── TOP SELLERS ── */}
      <div className="sg-section" id="top-sellers">
        <SectionHeader title="Top Sellers" useFullCollection label="Most Loved" />
        <div className="sg-grid-2col">
          {displayTopSellers.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>

      {/* ── HOMEPAGE CURATED GRID (admin-selected, no filters) ── */}
      <HomepageCuratedGrid />

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