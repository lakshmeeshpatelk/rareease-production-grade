'use client';

import { create } from 'zustand';
import { Product, Category, Notification, Toast } from '@/types';

interface UIState {
  activeCategoryOverlay: Category | null;
  activeProductOverlay: Product | null;
  isSearchOpen: boolean;
  isAccountOpen: boolean;
  isWishlistOpen: boolean;
  isOrderTrackingOpen: boolean;
  pendingTrackId: string | null;
  isPrivacyOpen: boolean;
  isTermsOpen: boolean;
  isReturnsOpen: boolean;
  isShippingOpen: boolean;
  isFullCollectionOpen: boolean;
  isNotificationsOpen: boolean;
  isContactOpen: boolean;
  isEnquiryOpen: boolean;
  isMobileMenuOpen: boolean;
  isCheckoutOpen: boolean;
  toasts: Toast[];
  notifications: Notification[];

  openCategoryOverlay: (cat: Category) => void;
  closeCategoryOverlay: () => void;
  openProductOverlay: (product: Product) => void;
  closeProductOverlay: () => void;
  toggleSearch: () => void;
  closeSearch: () => void;
  toggleAccount: () => void;
  openAccount: () => void;
  closeAccount: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  openOrderTracking: (orderId?: string) => void;
  closeOrderTracking: () => void;
  openPrivacy: () => void;
  closePrivacy: () => void;
  openTerms: () => void;
  closeTerms: () => void;
  openReturns: () => void;
  closeReturns: () => void;
  openShipping: () => void;
  closeShipping: () => void;
  openFullCollection: () => void;
  closeFullCollection: () => void;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  addToast: (icon: string, message: string) => void;
  removeToast: (id: string) => void;
  addNotification: (notif: Notification) => void;
  markAllRead: () => void;
  openContact: () => void;
  closeContact: () => void;
  openEnquiry: () => void;
  closeEnquiry: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeCategoryOverlay: null,
  activeProductOverlay: null,
  isSearchOpen: false,
  isAccountOpen: false,
  isWishlistOpen: false,
  isOrderTrackingOpen: false,
  pendingTrackId: null,
  isPrivacyOpen: false,
  isTermsOpen: false,
  isReturnsOpen: false,
  isShippingOpen: false,
  isFullCollectionOpen: false,
  isNotificationsOpen: false,
  isContactOpen: false,
  isEnquiryOpen: false,
  isMobileMenuOpen: false,
  isCheckoutOpen: false,
  toasts: [],
  notifications: [],

  openCategoryOverlay:  (cat) => set({ activeCategoryOverlay: cat }),
  closeCategoryOverlay: () => set({ activeCategoryOverlay: null }),
  openProductOverlay:   (product) => set({ activeProductOverlay: product }),
  closeProductOverlay:  () => set({ activeProductOverlay: null }),
  toggleSearch:  () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  closeSearch:   () => set({ isSearchOpen: false }),
  toggleAccount: () => set((s) => ({ isAccountOpen: !s.isAccountOpen })),
  openAccount:   () => set({ isAccountOpen: true }),
  closeAccount:  () => set({ isAccountOpen: false }),
  openWishlist:  () => set({ isWishlistOpen: true }),
  closeWishlist: () => set({ isWishlistOpen: false }),
  openOrderTracking:  (orderId?: string) => set({ isOrderTrackingOpen: true, pendingTrackId: orderId ?? null }),
  closeOrderTracking: () => set({ isOrderTrackingOpen: false, pendingTrackId: null }),
  openPrivacy:   () => set({ isPrivacyOpen: true }),
  closePrivacy:  () => set({ isPrivacyOpen: false }),
  openTerms:     () => set({ isTermsOpen: true }),
  closeTerms:    () => set({ isTermsOpen: false }),
  openReturns:   () => set({ isReturnsOpen: true }),
  closeReturns:  () => set({ isReturnsOpen: false }),
  openShipping:  () => set({ isShippingOpen: true }),
  closeShipping: () => set({ isShippingOpen: false }),
  openFullCollection:  () => set({ isFullCollectionOpen: true }),
  closeFullCollection: () => set({ isFullCollectionOpen: false }),
  toggleNotifications: () => set((s) => ({ isNotificationsOpen: !s.isNotificationsOpen })),
  closeNotifications:  () => set({ isNotificationsOpen: false }),

  addToast: (icon, message) => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, icon, message }] }));
    setTimeout(() => get().removeToast(id), 3200);
  },
  removeToast:     (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications].slice(0, 20),
  })),
  markAllRead:     () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, unread: false })) })),
  openContact:     () => set({ isContactOpen: true }),
  closeContact:    () => set({ isContactOpen: false }),
  openEnquiry:     () => set({ isEnquiryOpen: true }),
  closeEnquiry:    () => set({ isEnquiryOpen: false }),
  openMobileMenu:  () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  openCheckout:    () => set({ isCheckoutOpen: true }),
  closeCheckout:   () => set({ isCheckoutOpen: false }),
}));
