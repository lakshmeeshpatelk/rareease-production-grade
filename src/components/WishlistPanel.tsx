'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductsStore } from '@/store/productsStore';
import { useUIStore } from '@/store/uiStore';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';

export default function WishlistPanel() {
  const { isWishlistOpen, closeWishlist, openProductOverlay, addToast } = useUIStore();
  useEscapeKey(closeWishlist);
  useOverlayHistory(isWishlistOpen, closeWishlist);
  const { productIds, toggleWithSync } = useWishlistStore();
  const { getByIds } = useProductsStore();
  const { addItem, openCart } = useCartStore();

  const wishlistProducts = getByIds(productIds);

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <>
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1150, WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeWishlist}
          />
          <motion.div
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 400, background: '#070707', borderLeft: '1px solid rgba(255,255,255,0.06)', zIndex: 1200, display: 'flex', flexDirection: 'column' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Header */}
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <div>
                <div className="panel-title">
                  Wishlist
                  {wishlistProducts.length > 0 && (
                    <span className="panel-count-badge panel-count-badge--blush">{wishlistProducts.length}</span>
                  )}
                </div>
                {wishlistProducts.length > 0 && (
                  <div className="panel-subtitle">{wishlistProducts.length} saved {wishlistProducts.length === 1 ? 'piece' : 'pieces'}</div>
                )}
              </div>
              <button className="panel-close-btn" onClick={closeWishlist} aria-label="Close wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {wishlistProducts.length === 0 ? (
                <div className="wishlist-empty-art">
                  <div className="wishlist-heart-outline">♡</div>
                  <div className="empty-state-title">Nothing Saved Yet</div>
                  <p className="empty-state-desc">Bookmark pieces you love and find them here anytime.</p>
                  <button
                    className="empty-state-btn"
                    style={{ background: 'transparent', color: 'var(--white)', border: '1px solid rgba(255,255,255,0.2)' }}
                    onClick={closeWishlist}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blush)'; e.currentTarget.style.color = 'var(--blush)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--white)'; }}
                  >
                    Browse Collection
                  </button>
                </div>
              ) : (
                wishlistProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 14, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    {/* Thumb */}
                    <div style={{ width: 72, height: 90, background: 'linear-gradient(135deg,#111,#1c1c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.1)', letterSpacing: '0.04em' }}>
                        {product.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 90 }}>
                      <div>
                        {product.badge && (
                          <div style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 7px', marginBottom: 6, background: product.badge === 'New' ? 'var(--sage)' : product.badge === 'Limited' ? 'var(--blush)' : 'var(--white)', color: 'var(--black)' }}>
                            {product.badge}
                          </div>
                        )}
                        <div className="wishlist-item-name">{product.name}</div>
                        <div className="wishlist-item-price">
                          <strong>{formatPrice(product.price)}</strong>
                          {product.original_price && <del style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{formatPrice(product.original_price)}</del>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          onClick={() => { openProductOverlay(product); closeWishlist(); }}
                          className="wishlist-action-btn"
                          style={{ flex: 1, background: 'var(--white)', color: 'var(--black)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            const v = product.variants?.[0];
                            if (!v) return;
                            addItem({ productId: product.id, variantId: v.id, name: product.name, price: product.price, size: v.size, quantity: 1, slug: product.slug });
                            addToast('✓', `${product.name} added`);
                            openCart();
                          }}
                          className="wishlist-action-btn"
                          style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--white)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sage)'; e.currentTarget.style.color = 'var(--sage)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--white)'; }}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { toggleWithSync(product.id); addToast('♡', 'Removed from wishlist'); }}
                          style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                          aria-label="Remove"
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blush)'; e.currentTarget.style.color = 'var(--blush)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {wishlistProducts.length > 0 && (
              <div style={{ padding: '14px 24px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <button
                  className="wishlist-clear-btn"
                  onClick={() => { wishlistProducts.forEach(p => toggleWithSync(p.id)); addToast('♡', 'Wishlist cleared'); }}
                >
                  Clear Wishlist
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}