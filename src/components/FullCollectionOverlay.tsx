'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import { CAT_GRADIENTS, formatPrice } from '@/lib/utils';
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/categories';
import { Product } from '@/types';
import { useEscapeKey } from '@/lib/useEscapeKey';

const SORT_OPTIONS = [
  { label: 'Featured',           value: 'featured'   },
  { label: 'Price: Low to High', value: 'price-asc'  },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A–Z',          value: 'name-asc'   },
];

export default function FullCollectionOverlay() {
  const { isFullCollectionOpen, closeFullCollection, openProductOverlay, addToast } = useUIStore();
  useEscapeKey(closeFullCollection);
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

        {/* Row 2: controls */}
        <div className="fc-controls-row">

          {/* Category dropdown */}
          <div ref={catDropRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (!catOpen && catDropRef.current) {
                  const r = catDropRef.current.getBoundingClientRect();
                  const clampedLeft = Math.min(r.left, window.innerWidth - 234);
                  setCatDropPos({ top: r.bottom + 8, left: Math.max(8, clampedLeft) });
                }
                setCatOpen(!catOpen); setSortOpen(false);
              }}
              className={`fc-ctrl-btn fc-cat-btn${catOpen ? ' fc-ctrl-btn--open' : ''}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>Category</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <AnimatePresence>
              {catOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="fc-dropdown fc-cat-dropdown"
                  style={{ position: 'fixed', top: catDropPos.top, left: catDropPos.left, right: 'auto', zIndex: 9999 }}
                >
                  <div className="fc-dropdown-header">Browse Categories</div>

                  {/* All option */}
                  <button
                    onClick={() => { setActiveCat('all'); setCatOpen(false); }}
                    className={`fc-dropdown-item${activeCat === 'all' ? ' fc-dropdown-item--active' : ''}`}
                  >
                    <div>
                      <div className="fc-drop-name">All Collections</div>
                      <div className="fc-drop-label">{ALL_PRODUCTS.length} total pieces</div>
                    </div>
                    {activeCat === 'all' && <span className="fc-drop-check">✓</span>}
                  </button>

                  {CATEGORIES.map(c => {
                    const count = ALL_PRODUCTS.filter(p => p.category_id === c.id).length;
                    const isActive = c.id === activeCat;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setActiveCat(c.id); setCatOpen(false); }}
                        className={`fc-dropdown-item${isActive ? ' fc-dropdown-item--active' : ''}`}
                      >
                        <div>
                          <div className="fc-drop-name">{c.name}</div>
                          <div className="fc-drop-label">{c.label} · {count} pieces</div>
                        </div>
                        {isActive && <span className="fc-drop-check">✓</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="fc-divider" />

          {/* Sort dropdown */}
          <div ref={sortDropRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (!sortOpen && sortDropRef.current) {
                  const r = sortDropRef.current.getBoundingClientRect();
                  setSortDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                }
                setSortOpen(!sortOpen); setCatOpen(false);
              }}
              className={`fc-ctrl-btn${sortOpen ? ' fc-ctrl-btn--open' : ''}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
              </svg>
              <span>Sort</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="fc-dropdown fc-sort-dropdown"
                  style={{ position: 'fixed', top: sortDropPos.top, right: sortDropPos.right, left: 'auto', zIndex: 9999 }}
                >
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

      {/* ══════════════════════════════════════════
          CONTENT — "All" shows category rows, filter shows flat grid
      ══════════════════════════════════════════ */}
      <div className="fc-scroll">
        {activeCat === 'all' ? (
          /* ── ALL: grouped by category ── */
          CATEGORIES.map(cat => {
            const catProducts = applySort(ALL_PRODUCTS.filter(p => p.category_id === cat.id));
            if (catProducts.length === 0) return null;
            return (
              <div key={cat.id} className="fc-cat-section">
                {/* Section header */}
                <div className="fc-section-header">
                  <div>
                    <div className="fc-section-label">{cat.label}</div>
                    <h3 className="fc-section-title">{cat.name.toUpperCase()}</h3>
                  </div>
                  <button
                    onClick={() => setActiveCat(cat.id)}
                    className="fc-section-view-all"
                  >
                    View all {catProducts.length} →
                  </button>
                </div>

                {/* Product grid */}
                <div className="fc-product-grid">
                  {catProducts.map((product: Product, i: number) => (
                    <FCCard
                      key={product.id}
                      product={product}
                      index={i}
                      bg={getBg(cat.id, i)}
                      onView={() => openProductOverlay(product)}
                      onQuickAdd={(e) => handleQuickAdd(e, product)}
                      onWishlist={(e) => handleWishlist(e, product)}
                      isWishlisted={mounted && productIds.includes(product.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          /* ── FILTERED: flat grid ── */
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
      <div className="fc-card-bg" style={{ background: bg }}>
        <span className="fc-card-initials">
          {product.name.split(' ').map((w: string) => w[0]).join('')}
        </span>
      </div>

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
