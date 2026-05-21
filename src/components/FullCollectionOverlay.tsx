'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/categories';
import { getProductImages } from '@/lib/productImage';
import { Product } from '@/types';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';

const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price-asc'  },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A–Z',          value: 'name-asc'   },
];

export default function FullCollectionOverlay() {
  const { isFullCollectionOpen, closeFullCollection, openProductOverlay, addToast } = useUIStore();
  useEscapeKey(closeFullCollection);
  useOverlayHistory(isFullCollectionOpen, closeFullCollection);
  const { addItem, openCart } = useCartStore();
  const { toggleWithSync, productIds } = useWishlistStore();
  const { products: allStoreProducts, categories: storeCategories, load } = useProductsStore();

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const CATEGORIES = storeCategories.length > 0 ? storeCategories : STATIC_CATEGORIES;
  const ALL_PRODUCTS = allStoreProducts.filter(p => p.is_active);

  const [activeCat, setActiveCat]   = useState('all');
  const [sortVal, setSortVal]       = useState('price-asc');
  const [sortOpen, setSortOpen]     = useState(false);
  const [mounted, setMounted]       = useState(false);

  const sortDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isFullCollectionOpen) return;
    setActiveCat('all');
    setSortVal('price-asc');
    setSortOpen(false);
  }, [isFullCollectionOpen]);

  // Close sort sheet on outside tap
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (sortDropRef.current && !sortDropRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const handleQuickAdd = (e: React.MouseEvent | React.TouchEvent, product: Product) => {
    e.stopPropagation();
    const v = product.variants?.[0];
    if (!v) return;
    addItem({
      productId: product.id, variantId: v.id, name: product.name,
      price: product.price, size: v.size, quantity: 1, slug: product.slug,
    });
    addToast('✓', `${product.name} added to cart`);
    openCart();
  };

  const handleWishlist = (e: React.MouseEvent | React.TouchEvent, product: Product) => {
    e.stopPropagation();
    const wasIn = mounted && productIds.includes(product.id);
    toggleWithSync(product.id);
    addToast(wasIn ? '♡' : '♥', wasIn ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const applySort = (arr: Product[]) => {
    if (sortVal === 'price-asc')  return [...arr].sort((a, b) => a.price - b.price);
    if (sortVal === 'price-desc') return [...arr].sort((a, b) => b.price - a.price);
    if (sortVal === 'name-asc')   return [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  };

  const displayProducts = applySort(
    activeCat === 'all' ? ALL_PRODUCTS : ALL_PRODUCTS.filter(p => p.category_id === activeCat)
  );

  const currentCatLabel = activeCat === 'all'
    ? 'All Collections'
    : CATEGORIES.find(c => c.id === activeCat)?.name ?? 'Collection';

  const productCount = activeCat === 'all'
    ? `${CATEGORIES.length} Categories · ${ALL_PRODUCTS.length} Pieces`
    : `${displayProducts.length} Pieces`;

  if (!isFullCollectionOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--black)',
        zIndex: 800,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'clip',
        /* Prevent iOS rubber-band on the outer container */
        overscrollBehavior: 'none',
      }}
      onClick={() => { if (sortOpen) setSortOpen(false); }}
    >
      {/* ══════════ HEADER ══════════ */}
      <div className="fc-header" onClick={e => e.stopPropagation()}>

        {/* Row 1: back · title · close */}
        <div className="fc-header-row1">
          <button onClick={closeFullCollection} className="fc-back-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back</span>
          </button>

          <div className="fc-title-block">
            <h2 className="fc-title">
              {activeCat === 'all' ? 'ALL COLLECTIONS' : currentCatLabel.toUpperCase()}
            </h2>
            <div className="fc-subtitle">{productCount}</div>
          </div>

          <button onClick={closeFullCollection} className="fc-close-btn" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Row 2: category tabs + sort */}
        <div className="fc-controls-row">
          <div className="fc-tabs-scroll">
            {/* ALL tab */}
            <button
              onClick={() => setActiveCat('all')}
              className={`fc-tab-pill${activeCat === 'all' ? ' fc-tab-pill--active' : ''}`}
            >
              All
              <span className="fc-tab-count">{ALL_PRODUCTS.length}</span>
            </button>

            {CATEGORIES.map(c => {
              const count = ALL_PRODUCTS.filter(p => p.category_id === c.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`fc-tab-pill${activeCat === c.id ? ' fc-tab-pill--active' : ''}`}
                >
                  {c.name}
                  <span className="fc-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Sort — pinned right, bottom sheet on mobile */}
          <div className="fc-sort-wrap">
            <div ref={sortDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className={`fc-sort-pill${sortOpen ? ' fc-sort-pill--open' : ''}`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
                </svg>
                <span>{SORT_OPTIONS.find(o => o.value === sortVal)?.label ?? 'Sort'}</span>
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                    className="fc-dropdown fc-sort-dropdown"
                    style={{ zIndex: 9999 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="fc-dropdown-header">Sort by</div>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortVal(opt.value); setSortOpen(false); }}
                        className={`fc-dropdown-item${sortVal === opt.value ? ' fc-dropdown-item--active' : ''}`}
                      >
                        <span>{opt.label}</span>
                        {sortVal === opt.value && <span className="fc-drop-check">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="fc-scroll">
        {activeCat === 'all' ? (
          /* ALL: preview strips per category */
          <div className="fc-all-view">
            {CATEGORIES.map(cat => {
              const catProducts = applySort(ALL_PRODUCTS.filter(p => p.category_id === cat.id));
              if (catProducts.length === 0) return null;
              const preview = catProducts.slice(0, 8);
              return (
                <div key={cat.id} className="fc-cat-row">
                  <div className="fc-section-header">
                    <div>
                      <div className="fc-section-label">{cat.label}</div>
                      <h3 className="fc-section-title">{cat.name}</h3>
                    </div>
                    <button onClick={() => setActiveCat(cat.id)} className="fc-section-view-all">
                      See all {catProducts.length} →
                    </button>
                  </div>

                  <div className="fc-h-strip">
                    {preview.map((product: Product, i: number) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={i}
                        isWishlisted={mounted && productIds.includes(product.id)}
                        onView={() => openProductOverlay(product)}
                        onAdd={(e) => handleQuickAdd(e, product)}
                        onWish={(e) => handleWishlist(e, product)}
                        eager={i < 4}
                      />
                    ))}

                    {catProducts.length > 8 && (
                      <button className="fc-h-more-card" onClick={() => setActiveCat(cat.id)}>
                        <div className="fc-h-more-inner">
                          <span className="fc-h-more-num">+{catProducts.length - 8}</span>
                          <span className="fc-h-more-label">more</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* CATEGORY: full grid, all products */
          <div className="fc-all-view">
            {(() => {
              const cat = CATEGORIES.find(c => c.id === activeCat);
              if (!cat) return null;
              return (
                <div className="fc-cat-row">
                  <div className="fc-section-header">
                    <div>
                      <div className="fc-section-label">{cat.label}</div>
                      <h3 className="fc-section-title">{cat.name}</h3>
                    </div>
                    <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                      {displayProducts.length} pieces
                    </span>
                  </div>

                  <div className="fc-h-strip">
                    {displayProducts.map((product: Product, i: number) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={i}
                        isWishlisted={mounted && productIds.includes(product.id)}
                        onView={() => openProductOverlay(product)}
                        onAdd={(e) => handleQuickAdd(e, product)}
                        onWish={(e) => handleWishlist(e, product)}
                        eager={i < 4}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PRODUCT CARD — shared between All preview + Category view
   All interactions use :active states (works on both iOS and Android).
   No hover-only logic — mobile first.
════════════════════════════════════════════ */
interface ProductCardProps {
  product: Product;
  index: number;
  isWishlisted: boolean;
  eager: boolean;
  onView: () => void;
  onAdd: (e: React.MouseEvent) => void;
  onWish: (e: React.MouseEvent) => void;
}

function ProductCard({ product, isWishlisted, eager, onView, onAdd, onWish }: ProductCardProps) {
  const imgs = getProductImages(product);

  return (
    <div className="fc-h-card" onClick={onView}>
      {/* Image */}
      <div className="fc-h-img">
        {imgs.primary ? (
          <Image
            src={imgs.primary}
            alt={product.name}
            fill
            sizes="50vw"
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            loading={eager ? 'eager' : 'lazy'}
            priority={eager}
          />
        ) : (
          <div className="fc-h-placeholder">
            <span>{product.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</span>
          </div>
        )}

        {product.badge && <span className="fc-h-badge">{product.badge}</span>}

        {/* Wishlist — 44×44 touch target wrapping a 32×32 visual */}
        <button
          className={`fc-h-wish${isWishlisted ? ' fc-h-wish--active' : ''}`}
          onClick={onWish}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span className="fc-h-wish-inner">
            {isWishlisted ? '♥' : '♡'}
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="fc-h-info">
        <div className="fc-h-name">{product.name}</div>

        <div className="fc-h-price-row">
          <span className="fc-h-price">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="fc-h-price-original">{formatPrice(product.original_price)}</span>
          )}
        </div>

        {/* Add to Cart — full width, 44px, stops propagation so card click doesn't fire */}
        <button
          className="fc-h-add"
          onClick={onAdd}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}