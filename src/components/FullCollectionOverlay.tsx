'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import Image from 'next/image';
import { CAT_GRADIENTS, formatPrice } from '@/lib/utils';
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/categories';
import { getProductImages } from '@/lib/productImage';
import { Product } from '@/types';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';

const SORT_OPTIONS = [
  { label: 'Featured',           value: 'featured'   },
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

  // Load products on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use store data with static fallback
  const CATEGORIES = storeCategories.length > 0 ? storeCategories : STATIC_CATEGORIES;
  const ALL_PRODUCTS = allStoreProducts.filter(p => p.is_active);

  const [activeCat, setActiveCat] = useState('all');
  const [sortVal, setSortVal] = useState('featured');
  const [catOpen, setCatOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const catDropRef = useRef<HTMLDivElement>(null);
  const sortDropRef = useRef<HTMLDivElement>(null);
  const [catDropPos, setCatDropPos] = useState({ top: 0, left: 0 });
  const [sortDropPos, setSortDropPos] = useState({ top: 0, right: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isFullCollectionOpen) return;
    setActiveCat('all');
    setSortVal('featured');
    setCatOpen(false);
    setSortOpen(false);
  }, [isFullCollectionOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatOpen(false);
      if (sortDropRef.current && !sortDropRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const v = product.variants?.[0];
    if (!v) return;
    addItem({ productId: product.id, variantId: v.id, name: product.name, price: product.price, size: v.size, quantity: 1, slug: product.slug });
    addToast('✓', `${product.name} added to cart`);
    openCart();
  };

  const handleWishlist = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const wasIn = mounted && productIds.includes(product.id);
    toggleWithSync(product.id);
    addToast(wasIn ? '♡' : '♥', wasIn ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const getBg = (catId: string, index: number) => {
    const grads = CAT_GRADIENTS[catId] ?? CAT_GRADIENTS['cat-1'];
    return grads[index % grads.length];
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
      }}
      onClick={() => { if (catOpen) setCatOpen(false); if (sortOpen) setSortOpen(false); }}
    >
      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
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

        {/* Row 2: Sticky category tab pills + sort */}
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

          {/* Per-category tab pills */}
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

          {/* Sort — pinned right */}
          <div className="fc-sort-wrap">
            <div ref={sortDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!sortOpen && sortDropRef.current) {
                    const r = sortDropRef.current.getBoundingClientRect();
                    setSortDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                  }
                  setSortOpen(!sortOpen);
                }}
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
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.13 }}
                    className="fc-dropdown fc-sort-dropdown"
                    style={{ zIndex: 9999 }}
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

      {/* ══════════════════════════════════════════
          CONTENT — "All" shows category rows, filter shows flat grid
      ══════════════════════════════════════════ */}
      <div className="fc-scroll">
        {activeCat === 'all' ? (
          /* ── ALL: each category as a horizontal scroll preview strip ── */
          <div className="fc-all-view">
            {CATEGORIES.map(cat => {
              const catProducts = applySort(ALL_PRODUCTS.filter(p => p.category_id === cat.id));
              if (catProducts.length === 0) return null;
              const preview = catProducts.slice(0, 8);
              return (
                <div key={cat.id} className="fc-cat-row">
                  {/* Section header */}
                  <div className="fc-section-header">
                    <div>
                      <div className="fc-section-label">{cat.label}</div>
                      <h3 className="fc-section-title">{cat.name}</h3>
                    </div>
                    <button onClick={() => setActiveCat(cat.id)} className="fc-section-view-all">
                      See all {catProducts.length} →
                    </button>
                  </div>

                  {/* Horizontal scroll strip — 2 rows of 4 on mobile, single row on desktop */}
                  <div className="fc-h-strip">
                    {preview.map((product: Product, i: number) => (
                      <div key={product.id} className="fc-h-card" onClick={() => openProductOverlay(product)}>
                        <div className="fc-h-img">
                          {(() => {
                            const imgs = getProductImages(product);
                            return imgs.primary ? (
                              <Image
                                src={imgs.primary}
                                alt={product.name}
                                fill
                                sizes="(max-width:768px) 42vw, 16vw"
                                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                                priority={i < 4}
                                loading={i < 4 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="fc-h-placeholder">
                                <span>{product.name.split(' ').map((w: string) => w[0]).join('').slice(0,2)}</span>
                              </div>
                            );
                          })()}
                          {product.badge && (
                            <span className="fc-h-badge">{product.badge}</span>
                          )}
                        </div>
                        <div className="fc-h-info">
                          <div className="fc-h-name">{product.name}</div>
                          <div className="fc-h-price">{formatPrice(product.price)}</div>
                        </div>
                      </div>
                    ))}

                    {/* "See more" card if category has > 8 products */}
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
          /* ── FILTERED: full 2-col grid ── */
          <div className="fc-product-grid fc-flat-grid">
            {displayProducts.map((product: Product, i: number) => (
              <FCCard
                key={product.id}
                product={product}
                index={i}
                bg={getBg(activeCat, i)}
                onView={() => openProductOverlay(product)}
                onQuickAdd={(e) => handleQuickAdd(e, product)}
                onWishlist={(e) => handleWishlist(e, product)}
                isWishlisted={mounted && productIds.includes(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PRODUCT CARD
════════════════════════════════════════════ */
interface CardProps {
  product: Product;
  index: number;
  bg: string;
  onView: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  onWishlist: (e: React.MouseEvent) => void;
  isWishlisted: boolean;
}

function FCCard({ product, index, bg, onView, onQuickAdd, onWishlist, isWishlisted }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      onClick={onView}
      className="fc-card"
    >
      {/* Background */}
      {(() => {
        const imgs = getProductImages(product);
        return imgs.primary ? (
          <div className="fc-card-bg" style={{ position: 'relative', overflow: 'hidden' }}>
            <Image
              src={imgs.primary}
              alt={product.name}
              fill
              sizes="(max-width:768px) 50vw, 16vw"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="fc-card-bg" style={{ background: bg }}>
            <span className="fc-card-initials">
              {product.name.split(' ').map((w: string) => w[0]).join('')}
            </span>
          </div>
        );
      })()}

      {/* Index number */}
      <div className="fc-card-num">{String(index + 1).padStart(2, '0')}</div>

      {/* Badge */}
      {product.badge && (
        <div className="fc-card-badge" style={{
          background: product.badge === 'New' ? 'var(--sage)'
            : product.badge === 'Limited' ? 'var(--blush)' : 'var(--white)',
        }}>
          {product.badge}
        </div>
      )}

      {/* Wishlist */}
      <button
        onClick={onWishlist}
        className={`fc-wish-btn${isWishlisted ? ' fc-wish-btn--active' : ''}`}
        aria-label="Wishlist"
      >
        {isWishlisted ? '♥' : '♡'}
      </button>

      {/* Gradient */}
      <div className="fc-card-overlay" />

      {/* Info */}
      <div className="fc-card-info">
        <div className="fc-card-name">{product.name}</div>
        <div className="fc-card-price">
          <strong>{formatPrice(product.price)}</strong>
          {product.original_price && (
            <del className="fc-card-original">{formatPrice(product.original_price)}</del>
          )}
        </div>

        {/* Actions */}
        <div className="fc-card-actions">
          <button onClick={onQuickAdd} className="fc-quick-add">Add to Cart</button>
          <button onClick={onWishlist} className={`fc-wish-action${isWishlisted ? ' fc-wish-action--active' : ''}`}>
            {isWishlisted ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}