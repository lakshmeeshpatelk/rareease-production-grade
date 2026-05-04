'use client';

/**
 * HomeClient — Performance-optimised shell
 *
 * Strategy:
 *  • Above-the-fold (AnnouncementBar, Navbar, Hero, MarqueeStrip) → eager imports,
 *    rendered immediately so LCP fires as early as possible.
 *  • Below-the-fold sections (ShopGrid, BrandVideoSection, TrendingSection,
 *    BrandIntro, RecentlyViewed, Footer) → dynamic() so their JS is split into
 *    separate chunks and only downloaded after the critical path.
 *  • All overlays / drawers / panels → dynamic({ ssr: false }) so they are
 *    completely absent from the initial JS bundle and only loaded on first open.
 *  • The `mounted` guard is scoped only to the overlay layer, not the whole page,
 *    so the visible content renders immediately and avoids a blank-screen flash.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// ── Above-the-fold — load eagerly ──────────────────────────────────────────
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar          from '@/components/Navbar';
import Hero            from '@/components/Hero';
import MarqueeStrip    from '@/components/MarqueeStrip';

// ── Below-the-fold sections — lazy, but still SSR'd for SEO ────────────────
const ShopGrid          = dynamic(() => import('@/components/ShopGrid'));
const BrandVideoSection = dynamic(() => import('@/components/BrandVideoSection'));
const TrendingSection   = dynamic(() => import('@/components/TrendingSection'));
const BrandIntro        = dynamic(() => import('@/components/BrandIntro'));
const RecentlyViewed    = dynamic(() => import('@/components/RecentlyViewed'));
const Footer            = dynamic(() => import('@/components/Footer'));
const ScrollToTop       = dynamic(() => import('@/components/ScrollToTop'));
const ToastContainer    = dynamic(() => import('@/components/ToastContainer'));

// ── Overlays & drawers — client-only, zero bytes in the initial bundle ─────
const CartDrawer            = dynamic(() => import('@/components/CartDrawer'),            { ssr: false });
const SearchOverlay         = dynamic(() => import('@/components/SearchOverlay'),         { ssr: false });
const AccountPanel          = dynamic(() => import('@/components/AccountPanel'),          { ssr: false });
const WishlistPanel         = dynamic(() => import('@/components/WishlistPanel'),         { ssr: false });
const NotificationPanel     = dynamic(() => import('@/components/NotificationPanel'),     { ssr: false });
const CategoryOverlay       = dynamic(() => import('@/components/CategoryOverlay'),       { ssr: false });
const ProductOverlay        = dynamic(() => import('@/components/ProductOverlay'),        { ssr: false });
const CheckoutOverlay       = dynamic(() => import('@/components/CheckoutOverlay'),       { ssr: false });
const ContactPage           = dynamic(() => import('@/components/ContactPage'),           { ssr: false });
const EnquiryPage           = dynamic(() => import('@/components/EnquiryPage'),           { ssr: false });
const OrderTrackingOverlay  = dynamic(() => import('@/components/OrderTrackingOverlay'),  { ssr: false });
const FullCollectionOverlay = dynamic(() => import('@/components/FullCollectionOverlay'), { ssr: false });
const StaticPageOverlay     = dynamic(() => import('@/components/StaticPageOverlay'),     { ssr: false });
const MobileNav             = dynamic(() => import('@/components/MobileNav'),             { ssr: false });
const Cursor                = dynamic(() => import('@/components/Cursor'),                { ssr: false });

import { useUIStore }   from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';

export default function HomeClient() {
  // `mounted` now only gates the overlay layer, NOT the whole page.
  // Above-the-fold content renders on first paint; overlays appear after hydration.
  const [mounted, setMounted] = useState(false);

  const {
    activeCategoryOverlay,
    activeProductOverlay,
    isPrivacyOpen,
    isTermsOpen,
    isReturnsOpen,
    isShippingOpen,
    isFullCollectionOpen,
    isContactOpen,
    isAccountOpen,
    isWishlistOpen,
    isSearchOpen,
    isOrderTrackingOpen,
    isEnquiryOpen,
    isMobileMenuOpen,
    isCheckoutOpen,
    isNotificationsOpen,
  } = useUIStore();

  const { isOpen: isCartOpen } = useCartStore();

  useEffect(() => { setMounted(true); }, []);

  // Scroll-reveal observer
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }); },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mounted]);

  // Centralised body-scroll lock
  useEffect(() => {
    if (!mounted) return;
    const anyOpen =
      !!activeCategoryOverlay || !!activeProductOverlay ||
      isPrivacyOpen || isTermsOpen || isReturnsOpen ||
      isShippingOpen || isFullCollectionOpen ||
      isContactOpen || isAccountOpen || isWishlistOpen ||
      isSearchOpen || isOrderTrackingOpen || isEnquiryOpen ||
      isMobileMenuOpen || isCheckoutOpen || isCartOpen || isNotificationsOpen;

    if (anyOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow  = 'hidden';
      document.body.style.position  = 'fixed';
      document.body.style.top       = `-${scrollY}px`;
      document.body.style.width     = '100%';
      document.body.dataset.scrollY = String(scrollY);
    } else {
      const scrollY = parseInt(document.body.dataset.scrollY ?? '0', 10);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, scrollY);
    }

    return () => {
      const scrollY = parseInt(document.body.dataset.scrollY ?? '0', 10);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      delete document.body.dataset.scrollY;
      if (scrollY) window.scrollTo(0, scrollY);
    };
  }, [
    mounted,
    activeCategoryOverlay, activeProductOverlay,
    isPrivacyOpen, isTermsOpen, isReturnsOpen,
    isShippingOpen, isFullCollectionOpen,
    isContactOpen, isAccountOpen, isWishlistOpen,
    isSearchOpen, isOrderTrackingOpen, isEnquiryOpen,
    isMobileMenuOpen, isCheckoutOpen, isCartOpen, isNotificationsOpen,
  ]);

  return (
    <>
      {/* ── Critical path — renders immediately, no JS gate ── */}
      {mounted && <Cursor />}
      <AnnouncementBar />
      <Navbar />

      <main>
        <Hero />
        <MarqueeStrip />

        {/* ── Below fold — lazy chunks downloaded as user scrolls ── */}
        <ShopGrid />
        <BrandVideoSection />
        <TrendingSection />
        <ToastContainer />
      </main>

      <BrandIntro />
      <RecentlyViewed />
      <Footer />
      <ScrollToTop />

      {/* ── Overlays — zero bundle cost until after hydration ── */}
      {mounted && (
        <>
          <CartDrawer />
          <SearchOverlay />
          <AccountPanel />
          <WishlistPanel />
          <NotificationPanel />
          <CategoryOverlay />
          <ProductOverlay />
          <CheckoutOverlay />
          <ContactPage />
          <EnquiryPage />
          <OrderTrackingOverlay />

          <StaticPageOverlay type="privacy" />
          <StaticPageOverlay type="terms" />
          <StaticPageOverlay type="returns" />
          <StaticPageOverlay type="shipping" />
          <FullCollectionOverlay />

          <MobileNav />
        </>
      )}
    </>
  );
}
