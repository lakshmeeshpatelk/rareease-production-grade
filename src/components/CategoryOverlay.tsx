'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A–Z', value: 'name-asc' },
];

const SIZES = ['All', 'S', 'M', 'L', 'XL', 'XXL'];

export default function CategoryOverlay() {
  const { activeCategoryOverlay, closeCategoryOverlay, openProductOverlay, openCategoryOverlay, addToast } = useUIStore();
  useEscapeKey(closeCategoryOverlay);
  useOverlayHistory(!!activeCategoryOverlay, closeCategoryOverlay);
  const { addItem, openCart } = useCartStore();
  const { toggleWithSync, productIds } = useWishlistStore();
  const { products: allStoreProducts, categories: storeCategories, load } = useProductsStore();

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const CATEGORIES = storeCategories.length > 0 ? storeCategories : STATIC_CATEGORIES;

  const [activeSize, setActiveSize] = useState('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortVal, setSortVal] = useState('featured');
  const [catOpen, setCatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const catDropRef = useRef<HTMLDivElement>(null);
  const sortDropRef = useRef<HTMLDivElement>(null);
  const [catDropPos, setCatDropPos] = useState({ top: 0, left: 0 });
  const [sortDropPos, setSortDropPos] = useState({ top: 0, right: 0 });

  useEffect(() => { setMounted(true); }, []);

  // Reset filters when category changes
  useEffect(() => {
    setActiveSize('all');
    setSortVal('featured');
    setSortOpen(false);
    setCatOpen(false);
  }, [activeCategoryOverlay]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatOpen(false);
      if (sortDropRef.current && !sortDropRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!activeCategoryOverlay) return null;

  const cat = activeCategoryOverlay;
  const grads = CAT_GRADIENTS[cat.id] ?? CAT_GRADIENTS['cat-1'];

  let products: Product[] = allStoreProducts.filter(p => p.category_id === cat.id && p.is_active);

  if (activeSize !== 'all') {
    products = products.filter(p => p.variants?.some(v => v.size === activeSize));
  }
  if (sortVal === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (sortVal === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (sortVal === 'name-asc') products.sort((a, b) => a.name.localeCompare(b.name));

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

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortVal)?.label ?? 'Sort';

  return (
    <AnimatePresence>
      <motion.div
        key="cat-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--black)',
          zIndex: 800,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'clip',
        }}
      >
        {/* ══════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════ */}
        <div className="co-header">

          {/* Row 1: Back + title + close */}
          <div className="co-header-row1">
            <button
              onClick={closeCategoryOverlay}
              className="co-back-btn"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Back</span>
            </button>

            <div className="co-title-block">
              <h2 className="co-title">{cat.name.toUpperCase()}</h2>
              <div className="co-subtitle">
                <span>{cat.label}</span>
                <span className="co-dot">·</span>
                <span><strong>{products.length}</strong> pieces</span>
              </div>
            </div>

            <button
              onClick={closeCategoryOverlay}
              className="co-close-btn"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Row 2: Controls — Category switcher | Size filters | Sort */}
          <div className="co-controls-row">

            {/* ── Category switcher dropdown ── */}
            <div ref={catDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                if (!catOpen && catDropRef.current) {
                  const r = catDropRef.current.getBoundingClientRect();
                  const clampedLeft = Math.min(r.left, window.innerWidth - 234);
                  setCatDropPos({ top: r.bottom + 8, left: Math.max(8, clampedLeft) });
                }
                setCatOpen(!catOpen); setSortOpen(false);
              }}
                className={`co-ctrl-btn co-cat-btn${catOpen ? ' co-ctrl-btn--open' : ''}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span className="co-ctrl-label">Category</span>
                <svg
                  width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                >
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
                    className="co-dropdown co-cat-dropdown"
                    style={{ position: 'fixed', top: catDropPos.top, left: catDropPos.left, right: 'auto', zIndex: 9999 }}
                  >
                    <div className="co-dropdown-header">Browse Categories</div>
                    {CATEGORIES.map(c => {
                      const isActive = c.id === cat.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { openCategoryOverlay(c); setCatOpen(false); }}
                          className={`co-dropdown-item${isActive ? ' co-dropdown-item--active' : ''}`}
                        >
                          <div>
                            <div className="co-drop-name">{c.name}</div>
                            <div className="co-drop-label">{c.label}</div>
                          </div>
                          {isActive && (
                            <span className="co-drop-check">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Divider ── */}
            <div className="co-divider" />

            {/* ── Size filters ── */}
            <div className="co-sizes">
              {SIZES.map(size => {
                const val = size === 'All' ? 'all' : size;
                const isActive = activeSize === val;
                return (
                  <button
                    key={size}
                    onClick={() => setActiveSize(val)}
                    className={`co-size-btn${isActive ? ' co-size-btn--active' : ''}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* ── Divider ── */}
            <div className="co-divider" />

            {/* ── Sort dropdown ── */}
            <div ref={sortDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                if (!sortOpen && sortDropRef.current) {
                  const r = sortDropRef.current.getBoundingClientRect();
                  setSortDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                }
                setSortOpen(!sortOpen); setCatOpen(false);
              }}
                className={`co-ctrl-btn${sortOpen ? ' co-ctrl-btn--open' : ''}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
                </svg>
                <span className="co-ctrl-label">Sort</span>
                <svg
                  width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                >
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
                    className="co-dropdown co-sort-dropdown"
                    style={{ position: 'fixed', top: sortDropPos.top, right: sortDropPos.right, left: 'auto', zIndex: 9999 }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortVal(opt.value); setSortOpen(false); }}
                        className={`co-dropdown-item${sortVal === opt.value ? ' co-dropdown-item--active' : ''}`}
                      >
                        <span>{opt.label}</span>
                        {sortVal === opt.value && <span className="co-drop-check">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            PRODUCT GRID
        ══════════════════════════════════════════ */}
        <div
          className="co-grid-scroll"
          onClick={() => { if (catOpen) setCatOpen(false); if (sortOpen) setSortOpen(false); }}
        >
          {products.length === 0 ? (
            <div className="co-empty">
              <div className="co-empty-word">NONE</div>
              <div className="co-empty-msg">No items in size {activeSize}</div>
              <button className="co-empty-clear" onClick={() => setActiveSize('all')}>
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="co-product-grid">
              {products.map((product: Product, i: number) => {
                const isWishlisted = mounted && productIds.includes(product.id);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.35) }}
                    onClick={() => openProductOverlay(product)}
                    className="co-card"
                  >
                    {/* Product image or gradient fallback */}
                    {(() => {
                      const imgs = getProductImages(product);
                      return imgs.primary ? (
                        <div className="co-card-bg" style={{ position: 'relative', overflow: 'hidden' }}>
                          <Image
                            src={imgs.primary}
                            alt={product.name}
                            fill
                            sizes="(max-width:768px) 50vw, 20vw"
                            style={{ objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          className="co-card-bg"
                          style={{ background: grads[i % grads.length] }}
                        >
                          <span className="co-card-initials">
                            {product.name.split(' ').map((w: string) => w[0]).join('')}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Badge */}
                    {product.badge && (
                      <div
                        className="co-badge"
                        style={{
                          background: product.badge === 'New' ? 'var(--sage)'
                            : product.badge === 'Limited' ? 'var(--blush)' : 'var(--white)',
                        }}
                      >
                        {product.badge}
                      </div>
                    )}

                    {/* Low stock indicator */}
                    {!product.badge && product.inventory && (() => {
                      const total = product.inventory.reduce((s: number, v: {quantity: number; reserved: number}) => s + v.quantity - v.reserved, 0);
                      return total > 0 && total <= 5 ? (
                        <div className="co-low-stock">Only {total} left</div>
                      ) : null;
                    })()}

                    {/* Wishlist */}
                    <button
                      onClick={(e) => handleWishlist(e, product)}
                      className={`co-wish-btn${isWishlisted ? ' co-wish-btn--active' : ''}`}
                      aria-label="Wishlist"
                    >
                      {isWishlisted ? '♥' : '♡'}
                    </button>

                    {/* Gradient overlay */}
                    <div className="co-card-overlay" />

                    {/* Info */}
                    <div className="co-card-info">
                      <div className="co-card-cat">{cat.name}</div>
                      <div className="co-card-name">{product.name}</div>
                      <div className="co-card-price">
                        <strong>{formatPrice(product.price)}</strong>
                        {product.original_price && (
                          <del className="co-card-original">{formatPrice(product.original_price)}</del>
                        )}
                      </div>

                      {/* Actions (hover on desktop, always visible on mobile) */}
                      <div className="co-card-actions">
                        <button
                          onClick={(e) => handleQuickAdd(e, product)}
                          className="co-quick-add"
                        >
                          Quick Add
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openProductOverlay(product); }}
                          className="co-view-btn"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}