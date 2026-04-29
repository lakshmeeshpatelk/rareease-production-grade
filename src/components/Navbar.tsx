'use client';


import Image from 'next/image';


import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { CATEGORIES } from '@/lib/categories';

const MENS_CATS = CATEGORIES.filter(c => ['cat-1', 'cat-3', 'cat-5'].includes(c.id));
const WOMENS_CATS = CATEGORIES.filter(c => ['cat-2', 'cat-4', 'cat-6'].includes(c.id));

const CAT_SHORT: Record<string, string> = {
  'cat-1': 'Oversized T-Shirt',
  'cat-3': 'Sleeveless T-Shirt',
  'cat-5': 'Combo Set',
  'cat-2': 'Oversized T-Shirt',
  'cat-4': 'Sleeveless T-Shirt',
  'cat-6': 'Combo Set',
};

const CAT_ACCENTS: Record<string, string> = {
  'cat-1': '#FFFFFF', 'cat-3': '#BBBBBB', 'cat-5': '#CCCCCC',
  'cat-2': '#E8E8E8', 'cat-4': '#AAAAAA', 'cat-6': '#B8B8B8',
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shopExpanded, setShopExpanded] = useState<'mens' | 'womens' | null>(null);

  const { itemCount, openCart } = useCartStore();
  const { productIds } = useWishlistStore();
  const {
    toggleSearch, toggleAccount, openAccount, openCategoryOverlay, openWishlist,
    isMobileMenuOpen, openMobileMenu, closeMobileMenu, toggleNotifications,
  } = useUIStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const close = () => { closeMobileMenu(); setShopExpanded(null); };

  const goCategory = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat) { openCategoryOverlay(cat); close(); }
  };

  const mensOversized = CATEGORIES.find(c => c.id === 'cat-1') ?? CATEGORIES[0];

  return (
    <>
      <nav className={`nav-root${scrolled ? ' scrolled' : ''}`}>

        {/* Logo */}
        <a href="#" className="nav-logo"
          onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          aria-label="Rare Ease" style={{ display: 'flex', alignItems: 'center' }}
        >
          <Image src="/logo-text.svg" alt="Rare Ease" className="nav-logo-img" width={160} height={28} priority />
        </a>

        {/* Desktop links */}
        <ul className="nav-links">
          <li>
            <button
              onClick={() => openCategoryOverlay(mensOversized)}
              className="nav-text-btn"
            >
              Collection
            </button>
          </li>
        </ul>

        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="nav-icon-btn desktop-only-icon" onClick={toggleSearch} aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button className="nav-icon-btn desktop-only-icon" onClick={toggleNotifications} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <button className="nav-icon-btn desktop-only-icon" onClick={toggleAccount} aria-label="Account">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button className="nav-icon-btn desktop-only-icon" onClick={openWishlist} aria-label="Wishlist" style={{ position: 'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {mounted && productIds.length > 0 && <span className="nav-badge">{productIds.length}</span>}
          </button>
          <button className="nav-icon-btn" onClick={() => { closeMobileMenu(); openCart(); }} aria-label="Cart" style={{ position: 'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {mounted && itemCount() > 0 && <span className="nav-badge">{itemCount()}</span>}
          </button>

          {/* Hamburger */}
          <button className="nav-icon-btn hamburger-btn" onClick={() => isMobileMenuOpen ? closeMobileMenu() : openMobileMenu()} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isMobileMenuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          MOBILE HAMBURGER MENU
      ═══════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <div className="mobile-hamburger-menu">

          {/* Logo */}
          <div className="hm-logo-row">
            <Image src="/logo-text.svg" alt="Rare Ease" width={160} height={44} priority style={{width:'auto', height:44}} />
            <button className="hm-close" onClick={close} aria-label="Close menu">✕</button>
          </div>

          {/* ── SHOP MEN'S ── */}
          <div className="hm-shop-group">
            <button
              className="hm-shop-toggle"
              onClick={() => setShopExpanded(shopExpanded === 'mens' ? null : 'mens')}
            >
              <span className="hm-shop-label">Shop Men&apos;s</span>
              <span className={`hm-chevron${shopExpanded === 'mens' ? ' hm-chevron--open' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            {shopExpanded === 'mens' && (
              <div className="hm-cat-list">
                {MENS_CATS.map(cat => (
                  <button
                    key={cat.id}
                    className="hm-cat-item"
                    onClick={() => goCategory(cat.id)}
                  >
                    <span
                      className="hm-cat-dot"
                      style={{ background: CAT_ACCENTS[cat.id] }}
                    />
                    <span className="hm-cat-name">{CAT_SHORT[cat.id]}</span>
                    <span className="hm-cat-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── SHOP WOMEN'S ── */}
          <div className="hm-shop-group">
            <button
              className="hm-shop-toggle"
              onClick={() => setShopExpanded(shopExpanded === 'womens' ? null : 'womens')}
            >
              <span className="hm-shop-label">Shop Women&apos;s</span>
              <span className={`hm-chevron${shopExpanded === 'womens' ? ' hm-chevron--open' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            {shopExpanded === 'womens' && (
              <div className="hm-cat-list">
                {WOMENS_CATS.map(cat => (
                  <button
                    key={cat.id}
                    className="hm-cat-item"
                    onClick={() => goCategory(cat.id)}
                  >
                    <span
                      className="hm-cat-dot"
                      style={{ background: CAT_ACCENTS[cat.id] }}
                    />
                    <span className="hm-cat-name">{CAT_SHORT[cat.id]}</span>
                    <span className="hm-cat-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Secondary links ── */}
          <div className="hm-secondary">
            {[
              { label: 'Search', action: () => { toggleSearch(); close(); } },
              { label: 'Account', action: () => { openAccount(); close(); } },
              { label: `Wishlist${mounted && productIds.length > 0 ? ` (${productIds.length})` : ''}`, action: () => { openWishlist(); close(); } },
            ].map(item => (
              <button key={item.label} className="hm-secondary-link" onClick={item.action}>
                {item.label}
              </button>
            ))}
          </div>

          {/* ── Footer note ── */}
          <div className="hm-footer">rareeaseofficial@gmail.com</div>
        </div>
      )}
    </>
  );
}
