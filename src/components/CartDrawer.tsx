'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, getInventoryForVariant, SHIPPING_FREE_THRESHOLD, SHIPPING_COST } from '@/lib/utils';
import CheckoutOverlayTrigger from './CheckoutOverlayTrigger';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useFocusTrap } from '@/lib/useFocusTrap';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, itemCount } = useCartStore();
  const { products } = useProductsStore();

  useEscapeKey(closeCart);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { addToast } = useUIStore();

  // Helper: get max available qty for a cart item
  const getMaxQty = (productId: string, variantId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 99;
    const qty = getInventoryForVariant(product, variantId);
    return qty > 0 ? qty : 0;
  };
  const subtotal   = total();
  const shipping   = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_COST;
  const grandTotal = subtotal + shipping;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="cart-overlay-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
          />
          <motion.div
            ref={trapRef}
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* HEADER */}
            <div className="cart-drawer-header">
              <div className="cart-drawer-title">
                <span>Cart</span>
                {itemCount() > 0 && (
                  <span className="cart-count-badge">{itemCount()}</span>
                )}
              </div>
              <button className="cart-close-btn" onClick={closeCart} aria-label="Close cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* FREE SHIPPING PROGRESS */}
            {items.length > 0 && (
              <div style={{ padding: '0 24px' }}>
                <div className="shipping-progress-wrap">
                  {shipping === 0 ? (
                    <div className="shipping-free-label">✦ Free shipping unlocked on this order</div>
                  ) : (
                    <div className="shipping-free-label">
                      Add {formatPrice(SHIPPING_FREE_THRESHOLD - subtotal)} more for free shipping
                    </div>
                  )}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              /* EMPTY STATE */
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div className="empty-state-title">Your Cart Is Empty</div>
                <p className="empty-state-desc">
                  Discover rare pieces crafted for<br />those who move between worlds.
                </p>
                <button
                  onClick={closeCart}
                  style={{
                    padding: '13px 32px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: 'var(--black)',
                    background: 'var(--white)',
                    border: 'none',
                    transition: 'background 0.28s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              <>
                {/* ITEMS */}
                <div className="cart-items-list">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="cart-item-v2">
                      <div className="cart-item-img-v2" style={{ position: 'relative', overflow: 'hidden' }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="72px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%',
                            background: 'linear-gradient(135deg, #131313, #1d1d1d)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 20,
                              color: 'rgba(255,255,255,0.12)',
                              letterSpacing: '0.04em',
                            }}>
                              {item.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="cart-item-body-v2">
                        <div>
                          <div className="cart-item-name-v2">{item.name}</div>
                          <div className="cart-item-meta-v2">Size {item.size}</div>
                        </div>
                        <div className="cart-item-controls">
                          <div className="qty-control">
                            <button
                              className="qty-control-btn"
                              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >−</button>
                            <span className="qty-control-value">{item.quantity}</span>
                            <button
                              className="qty-control-btn"
                              onClick={() => {
                                const max = getMaxQty(item.productId, item.variantId);
                                if (item.quantity >= max) {
                                  addToast('⚠', `Only ${max} in stock`);
                                } else {
                                  updateQuantity(item.productId, item.variantId, item.quantity + 1);
                                }
                              }}
                              disabled={item.quantity >= getMaxQty(item.productId, item.variantId)}
                            >+</button>
                          </div>
                          <div className="cart-item-price-v2">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                        <button
                          className="cart-remove-v2"
                          onClick={() => {
                            removeItem(item.productId, item.variantId);
                            addToast('✓', 'Removed from cart');
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FOOTER */}
                <div className="cart-footer">
                  <div className="cart-summary-row">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Shipping</span>
                    <span>
                      {shipping === 0
                        ? <span style={{ color: 'var(--sage)', fontWeight: 500 }}>FREE</span>
                        : formatPrice(shipping)
                      }
                    </span>
                  </div>
                  <div className="cart-total-row">
                    <span className="cart-total-label">Total</span>
                    <span className="cart-total-amount">{formatPrice(grandTotal)}</span>
                  </div>
                  <CheckoutOverlayTrigger onClose={closeCart} />
                  <button className="cart-continue-btn" onClick={closeCart}>
                    Continue Shopping
                  </button>
                  <div className="checkout-trust-row" style={{ justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {[
                      { icon: '🔒', label: 'Secure' },
                      { icon: '✦', label: 'Authentic' },
                      { icon: '🚚', label: 'Free Shipping' },
                    ].map(({ icon, label }) => (
                      <div key={label} className="checkout-trust-item">
                        <span style={{ fontSize: 12 }}>{icon}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
