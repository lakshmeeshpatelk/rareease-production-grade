'use client';


import Image from 'next/image';


import { useState, useMemo, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, CAT_GRADIENTS, getInventoryForVariant } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { CATEGORIES } from '@/lib/categories';
import type { Product } from '@/types';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const TOP_SELLERS_IDS  = ['mos-08', 'wos-05', 'msl-02', 'wsl-02'];

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
    // Check inventory before adding
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
            <Image src={imgs.primary!} alt={product.name} fill sizes="(max-width:768px) 50vw, 25vw" style={{objectFit:'cover'}}
              className={`pc-img${hovered && imgs.secondary ? ' pc-img--hide' : ''}`}
              loading={priority ? 'eager' : 'lazy'} />
            {imgs.secondary && (
              <Image src={imgs.secondary!} alt={product.name} fill sizes="(max-width:768px) 50vw, 25vw" style={{objectFit:'cover'}}
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

function SectionHeader({ title, catId, label, useFullCollection = false }: {
  title: string; catId?: string; label?: string; useFullCollection?: boolean;
}) {
  const { openCategoryOverlay, openFullCollection } = useUIStore();
  const { categories } = useProductsStore();
  const cats = categories.length > 0 ? categories : CATEGORIES;

  const handleViewAll = () => {
    if (useFullCollection) { openFullCollection(); return; }
    if (catId) {
      const cat = cats.find(c => c.id === catId);
      if (cat) openCategoryOverlay(cat);
    }
  };
  return (
    <div className="sh-row">
      <div className="sh-left">
        {label && <span className="sh-eyebrow">{label}</span>}
        <h2 className="sh-title">{title}</h2>
      </div>
      <button className="sh-view-all" onClick={handleViewAll}>View All →</button>
    </div>
  );
}

// ── Sort & Filter ────────────────────────────────────────────────
type SortKey = 'default' | 'price-asc' | 'price-desc' | 'newest';
type SizeFilter = '' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',    label: 'Featured'           },
  { value: 'newest',     label: 'Newest'             },
  { value: 'price-asc',  label: 'Price: Low → High'  },
  { value: 'price-desc', label: 'Price: High → Low'  },
];

function AllProductsGrid() {
  const { openCategoryOverlay } = useUIStore();
  const { products: allProducts, categories, load, loading } = useProductsStore();
  const [activeCat,   setActiveCat]   = useState<string>('all');
  const [activeSort,  setActiveSort]  = useState<SortKey>('default');
  const [activeSize,  setActiveSize]  = useState<SizeFilter>('');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Ensure loaded
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = categories.length > 0 ? categories : CATEGORIES;

  const filtered = useMemo(() => {
    let products = allProducts.filter(p => p.is_active);

    // When viewing "All" category on homepage, show only homepage_featured products (if any are set)
    // otherwise fall back to all products
    const hasHomepageFeatured = products.some(p => p.homepage_featured);
    if (activeCat === 'all' && activeSort === 'default' && hasHomepageFeatured && !activeSize && !inStockOnly) {
      products = products.filter(p => p.homepage_featured);
    }

    if (activeCat !== 'all') products = products.filter(p => p.category_id === activeCat);
    if (activeSize) {
      products = products.filter(p => {
        const variant = p.variants?.find(v => v.size === activeSize);
        if (!variant) return false;
        const inv = p.inventory?.find(i => i.variant_id === variant.id);
        return (inv?.quantity ?? 0) > 0;
      });
    }
    if (inStockOnly) {
      products = products.filter(p => p.inventory?.some(i => i.quantity > 0));
    }
    switch (activeSort) {
      case 'price-asc':  return [...products].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...products].sort((a, b) => b.price - a.price);
      case 'newest':     return [...products].sort((a, b) => b.created_at.localeCompare(a.created_at));
      default:
        // Use homepage_sort_order when showing homepage_featured products,
        // otherwise use collection_sort_order
        if (activeCat === 'all' && hasHomepageFeatured && !activeSize && !inStockOnly) {
          return [...products].sort((a, b) => (a.homepage_sort_order ?? 9999) - (b.homepage_sort_order ?? 9999));
        }
        return [...products].sort((a, b) => (a.collection_sort_order ?? 9999) - (b.collection_sort_order ?? 9999));
    }
  }, [allProducts, activeCat, activeSort, activeSize, inStockOnly]);

  const activeCount = (activeCat !== 'all' ? 1 : 0) + (activeSize ? 1 : 0) + (inStockOnly ? 1 : 0);
  const clearAll = () => { setActiveCat('all'); setActiveSize(''); setInStockOnly(false); setActiveSort('default'); };

  return (
    <div className="sg-section" id="all-products">
      <div className="sh-row">
        <div className="sh-left">
          <span className="sh-eyebrow">Full Collection</span>
          <h2 className="sh-title">All Products</h2>
        </div>
        {activeCount > 0 && (
          <button className="sh-view-all" onClick={clearAll} style={{ color: 'var(--blush)' }}>
            Clear filters ({activeCount}) ✕
          </button>
        )}
      </div>

      <div className="sg-filter-bar">
        <div className="sg-filter-group">
          <button className={`sg-filter-pill${activeCat === 'all' ? ' active' : ''}`} onClick={() => setActiveCat('all')}>
            All
          </button>
          {cats.map(c => (
            <button key={c.id} className={`sg-filter-pill${activeCat === c.id ? ' active' : ''}`}
              onClick={() => setActiveCat(activeCat === c.id ? 'all' : c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="sg-filter-group">
          {SIZES.map(s => (
            <button key={s} className={`sg-filter-pill sg-filter-pill--size${activeSize === s ? ' active' : ''}`}
              onClick={() => setActiveSize(activeSize === s ? '' : s as SizeFilter)}>
              {s}
            </button>
          ))}
        </div>

        <div className="sg-filter-right">
          <button className={`sg-filter-pill${inStockOnly ? ' active' : ''}`} onClick={() => setInStockOnly(p => !p)}>
            In Stock
          </button>
          <select className="sg-sort-select" value={activeSort} onChange={e => setActiveSort(e.target.value as SortKey)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="sg-results-count">
        {loading && allProducts.length === 0
          ? 'Loading products…'
          : (() => {
              const hasHomepageFeatured = allProducts.filter(p => p.is_active).some(p => p.homepage_featured);
              const isHomepageCurated = activeCat === 'all' && activeSort === 'default' && hasHomepageFeatured && !activeSize && !inStockOnly;
              return `${filtered.length} product${filtered.length !== 1 ? 's' : ''}${isHomepageCurated ? ' (curated)' : activeCount > 0 ? ' matching filters' : ''}`;
            })()
        }
      </div>

      {!loading && filtered.length === 0 && allProducts.length > 0 ? (
        <div className="sg-empty">
          <p>No products match your filters.</p>
          <button onClick={clearAll}>Clear all filters</button>
        </div>
      ) : loading && allProducts.length === 0 ? (
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
          {filtered.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}

export default function ShopGrid() {
  const { products, load, getByIds } = useProductsStore();
  const { openCategoryOverlay } = useUIStore();
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

  const oc = (id: string) => {
    const cat = cats.find(c => c.id === id);
    if (cat) openCategoryOverlay(cat);
  };

  return (
    <div className="sg-root" id="shop">

      {/* ── NEW ARRIVALS ── */}
      <div className="sg-section">
        <SectionHeader title="New Arrivals" catId="cat-1" label="SS25" />
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

      {/* ── SHOP BY CATEGORY ── */}
      <div className="sg-section">
        <div className="sh-row">
          <div className="sh-left">
            <span className="sh-eyebrow">Collections</span>
            <h2 className="sh-title">Shop By Category</h2>
          </div>
        </div>
        <div className="sg-cat-strip">
          {cats.map(cat => (
            <button key={cat.id} className="sg-cat-pill" onClick={() => oc(cat.id)}>
              <div className="sg-cat-pill-img">
                {cat.image_url ? (
                  <Image src={cat.image_url} alt={cat.name} fill sizes="48px" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="sg-cat-pill-placeholder">RE</div>
                )}
              </div>
              <span className="sg-cat-pill-name">{cat.name}</span>
            </button>
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

      {/* ── ALL PRODUCTS with sort/filter ── */}
      <AllProductsGrid />

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