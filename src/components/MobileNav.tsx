'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { CATEGORIES } from '@/lib/categories';

// Men's: cat-1, cat-3, cat-5 | Women's: cat-2, cat-4, cat-6
const MENS_CATS = CATEGORIES.filter(c => ['cat-1', 'cat-3', 'cat-5'].includes(c.id));
const WOMENS_CATS = CATEGORIES.filter(c => ['cat-2', 'cat-4', 'cat-6'].includes(c.id));

const CAT_SHORT: Record<string, string> = {
  'cat-1': "Oversized Tee",
  'cat-2': "Oversized Tee",
  'cat-3': "Sleeveless Tee",
  'cat-4': "Sleeveless Tee",
  'cat-5': "Combo Set",
  'cat-6': "Combo Set",
};

const CAT_ACCENTS: Record<string, string> = {
  'cat-1': '#FFFFFF', 'cat-2': '#E8E8E8', 'cat-3': '#BBBBBB',
  'cat-4': '#AAAAAA', 'cat-5': '#CCCCCC', 'cat-6': '#B8B8B8',
};

// Sheet state now includes 'both' to show men's + women's sections together
type ShopSheet = 'both' | null;

export default function MobileNav() {
  const { openCart, itemCount } = useCartStore();
  const {
    openAccount, openCategoryOverlay, openWishlist,
    isWishlistOpen, isAccountOpen,
    toggleSearch, isSearchOpen,
  } = useUIStore();
  const { isOpen: isCartDrawerOpen } = useCartStore();
  const { productIds } = useWishlistStore();

  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState('home');
  const [shopSheet, setShopSheet] = useState<ShopSheet>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reset active highlight when overlays close externally (e.g. Escape key / backdrop tap)
  useEffect(() => {
    if (!isWishlistOpen && active === 'wishlist') setActive('home');
  }, [isWishlistOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAccountOpen && active === 'account') setActive('home');
  }, [isAccountOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCartDrawerOpen && active === 'cart') setActive('home');
  }, [isCartDrawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSearchOpen && active === 'search') setActive('home');
  }, [isSearchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sheet on outside tap
  useEffect(() => {
    if (!shopSheet) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setShopSheet(null);
      }
    };
    document.addEventListener('touchstart', handler);
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [shopSheet]);

  const cartCount = mounted ? itemCount() : 0;
  const wishCount = mounted ? productIds.length : 0;

  const handleCat = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat) {
      openCategoryOverlay(cat);
      setShopSheet(null);
      setActive('shop');
    }
  };

  const toggleShopSheet = () => {
    setShopSheet(prev => prev === 'both' ? null : 'both');
    setActive(shopSheet === 'both' ? 'home' : 'shop');
  };

  // Shared icon + label button render
  const NavBtn = ({
    id, label, svg, badge, badgeColor, onClick,
  }: {
    id: string; label: string; svg: React.ReactNode;
    badge?: number; badgeColor?: string; onClick: () => void;
  }) => {
    const isActive = active === id;
    return (
      <button
        aria-label={label}
        onClick={onClick}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 4, background: 'none', border: 'none',
          padding: '6px 2px', cursor: 'pointer',
          position: 'relative', minHeight: 52,
          WebkitTapHighlightColor: 'transparent',
          outline: 'none', userSelect: 'none',
        }}
      >
        {isActive && (
          <span style={{
            position: 'absolute', top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: 3, height: 3, borderRadius: '50%',
            background: 'var(--sage)',
          }} />
        )}
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isActive ? 'var(--sage)' : 'rgba(255,255,255,0.42)',
          transition: 'color 0.18s', lineHeight: 0, pointerEvents: 'none',
        }}>
          {svg}
        </span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 8, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isActive ? 'var(--sage)' : 'rgba(255,255,255,0.32)',
          transition: 'color 0.18s', lineHeight: 1, pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: '18%',
            background: badgeColor ?? 'var(--sage)', color: 'var(--black)',
            fontSize: 7, fontWeight: 800, fontFamily: 'var(--font-body)',
            borderRadius: '50%', minWidth: 14, height: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 2px', pointerEvents: 'none',
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ── Combined Shop sheet — Men's + Women's sections ── */}
      {shopSheet === 'both' && (
        <div
          ref={sheetRef}
          style={{
            position: 'fixed',
            bottom: 'var(--mobile-nav-h, 72px)',
            left: 0, right: 0,
            background: '#0a0a0a',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            zIndex: 199,
            padding: '16px 0 8px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
            animation: 'slideUpSheet 0.2s ease-out',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {/* Sheet header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 4,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--white)',
            }}>
              Shop
            </span>
            <button
              onClick={() => setShopSheet(null)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: 18, cursor: 'pointer', padding: '4px 8px',
                lineHeight: 1, minHeight: 32,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Men's section */}
          <div style={{
            padding: '8px 20px 4px',
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)',
          }}>
            Men&apos;s
          </div>
          {MENS_CATS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCat(cat.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 14, padding: '12px 20px',
                background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onTouchEnd={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: CAT_ACCENTS[cat.id],
                flexShrink: 0,
                boxShadow: `0 0 8px ${CAT_ACCENTS[cat.id]}66`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--white)', lineHeight: 1.1,
                }}>
                  {CAT_SHORT[cat.id]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 3,
                }}>
                  {cat.label}
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</span>
            </button>
          ))}

          {/* Women's section */}
          <div style={{
            padding: '12px 20px 4px',
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)',
          }}>
            Women&apos;s
          </div>
          {WOMENS_CATS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCat(cat.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 14, padding: '12px 20px',
                background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onTouchEnd={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: CAT_ACCENTS[cat.id],
                flexShrink: 0,
                boxShadow: `0 0 8px ${CAT_ACCENTS[cat.id]}66`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--white)', lineHeight: 1.1,
                }}>
                  {CAT_SHORT[cat.id]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 3,
                }}>
                  {cat.label}
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom nav bar — 5 buttons: Home | Shop | Search | Cart | Account ── */}
      <nav className="mobile-nav-bottom">

        {/* Home */}
        <NavBtn
          id="home" label="Home"
          onClick={() => { setActive('home'); setShopSheet(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          svg={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />

        {/* Shop — combined Men's + Women's */}
        <NavBtn
          id="shop" label="Shop"
          onClick={toggleShopSheet}
          svg={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          }
        />

        {/* Search */}
        <NavBtn
          id="search" label="Search"
          onClick={() => {
            setActive('search');
            setShopSheet(null);
            toggleSearch();
          }}
          svg={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          }
        />

        {/* Cart */}
        <NavBtn
          id="cart" label="Cart"
          badge={cartCount} badgeColor="var(--sage)"
          onClick={() => { setActive('cart'); setShopSheet(null); openCart(); }}
          svg={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          }
        />

        {/* Account */}
        <NavBtn
          id="account" label="Account"
          onClick={() => { setActive('account'); setShopSheet(null); openAccount(); }}
          svg={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          }
        />
      </nav>
    </>
  );
}