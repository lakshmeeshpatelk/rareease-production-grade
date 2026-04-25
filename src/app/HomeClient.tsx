'use client';

import { useEffect, useState } from 'react';
import Cursor from '@/components/Cursor';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MarqueeStrip from '@/components/MarqueeStrip';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SearchOverlay from '@/components/SearchOverlay';
import AccountPanel from '@/components/AccountPanel';
import WishlistPanel from '@/components/WishlistPanel';
import CategoryOverlay from '@/components/CategoryOverlay';
import ProductOverlay from '@/components/ProductOverlay';
import NotificationPanel from '@/components/NotificationPanel';
import StaticPageOverlay from '@/components/StaticPageOverlay';
import ToastContainer from '@/components/ToastContainer';
import CheckoutOverlay from '@/components/CheckoutOverlay';
import FullCollectionOverlay from '@/components/FullCollectionOverlay';
import MobileNav from '@/components/MobileNav';
import ContactPage from '@/components/ContactPage';
import EnquiryPage from '@/components/EnquiryPage';
import OrderTrackingOverlay from '@/components/OrderTrackingOverlay';
import BrandIntro from '@/components/BrandIntro';
import ShopGrid from '@/components/ShopGrid';
import RecentlyViewed from '@/components/RecentlyViewed';
import BrandVideoSection from '@/components/BrandVideoSection';  // ← NEW
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import AnnouncementBar from '@/components/AnnouncementBar';
import ScrollToTop from '@/components/ScrollToTop';

export default function HomeClient() {
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
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }); },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mounted]);

  // Centralised body-scroll lock
  useEffect(() => {
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
    activeCategoryOverlay, activeProductOverlay,
    isPrivacyOpen, isTermsOpen, isReturnsOpen,
    isShippingOpen, isFullCollectionOpen,
    isContactOpen, isAccountOpen, isWishlistOpen,
    isSearchOpen, isOrderTrackingOpen, isEnquiryOpen,
    isMobileMenuOpen, isCheckoutOpen, isCartOpen, isNotificationsOpen,
  ]);

  if (!mounted) return null;

  return (
    <>
      <Cursor />
      <AnnouncementBar />
      <Navbar />

      <main>
        <Hero />
        <MarqueeStrip />
        <ShopGrid />

        {/* ── Brand Promo Video (above Trending) ── */}
        <BrandVideoSection />

        {/* ── Trending Now ── */}
        <ToastContainer />
      </main>

      <BrandIntro />
      <RecentlyViewed />
      <Footer />

      {/* ── Overlays ── */}
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

      {/* ── Static policy pages ── */}
      <StaticPageOverlay type="privacy" />
      <StaticPageOverlay type="terms" />
      <StaticPageOverlay type="returns" />
      <StaticPageOverlay type="shipping" />
      <FullCollectionOverlay />

      {/* ── Mobile bottom nav ── */}
      <MobileNav />

      <ScrollToTop />
    </>
  );
}