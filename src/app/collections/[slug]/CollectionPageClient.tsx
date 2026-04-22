'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { CATEGORIES } from '@/lib/categories';
import type { Category, Product } from '@/types';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
type SortKey = 'default' | 'price-asc' | 'price-desc';
type SizeFilter = '' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export default function CollectionPageClient({ category, products }: { category: Category; products: Product[] }) {
  const { addItem, openCart } = useCartStore();
  const { addToast, openProductOverlay } = useUIStore();
  const [sort, setSort]           = useState<SortKey>('default');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('');

  const filtered = useMemo(() => {
    let ps = [...products];
    if (sizeFilter) {
      ps = ps.filter(p => {
        const v = p.variants?.find(v => v.size === sizeFilter);
        if (!v) return false;
        return (p.inventory?.find(i => i.variant_id === v.id)?.quantity ?? 0) > 0;
      });
    }
    if (sort === 'price-asc')  return ps.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return ps.sort((a, b) => b.price - a.price);
    return ps;
  }, [products, sort, sizeFilter]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: category.name,
        description: category.description,
        url: `https://rareease.com/collections/${category.slug}`,
      },
      {
        '@type': 'ItemList',
        name: `${category.name} — Rare Ease`,
        numberOfItems: filtered.length,
        itemListElement: filtered.slice(0, 20).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `https://rareease.com/products/${p.slug}`,
          name: p.name,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pp-root">
        <nav className="pp-topbar">
          <Link href="/" className="pp-logo">RARE EASE</Link>
          <div className="pp-breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <span>{category.name}</span>
          </div>
          <button className="pp-cart-btn" onClick={openCart}>Cart →</button>
        </nav>

        {/* Hero strip */}
        <div className="pp-cat-hero">
          <div className="pp-cat-badge">{category.hero_badge}</div>
          <h1 className="pp-cat-title">{category.name}</h1>
          {category.description && <p className="pp-cat-desc">{category.description}</p>}
          <div className="pp-cat-count">{filtered.length} pieces</div>
        </div>

        {/* Filter bar */}
        <div className="sg-filter-bar" style={{ padding: '14px var(--page-x, 20px)' }}>
          <div className="sg-filter-group">
            {SIZES.map(s => (
              <button key={s} className={`sg-filter-pill sg-filter-pill--size${sizeFilter === s ? ' active' : ''}`}
                onClick={() => setSizeFilter(sizeFilter === s ? '' : s as SizeFilter)}>
                {s}
              </button>
            ))}
          </div>
          <div className="sg-filter-right">
            <select className="sg-sort-select" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="pp-col-grid">
          {filtered.map(p => {
            const imgs = getProductImages(p);
            return (
              <Link key={p.id} href={`/products/${p.slug}`} className="pp-col-card">
                <div className="pp-col-img">
                  {imgs.primary ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgs.primary} alt={p.name} />
                  ) : (
                    <div className="pp-related-placeholder">
                      {getProductInitials(p)}
                    </div>
                  )}
                  {p.badge && <div className="pp-badge">{p.badge}</div>}
                </div>
                <div className="pp-col-info">
                  <div className="pp-col-name">{p.name}</div>
                  <div className="pp-col-price-row">
                    <span>{formatPrice(p.price)}</span>
                    {p.original_price && <del style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{formatPrice(p.original_price)}</del>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Other collections */}
        <div className="pp-other-cats">
          <div className="pp-related-title">Other Collections</div>
          <div className="pp-other-cats-grid">
            {CATEGORIES.filter(c => c.id !== category.id).map(c => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="pp-other-cat-pill">
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="pp-back"><Link href="/#shop">← Back to Shop</Link></div>
      </div>
    </>
  );
}
