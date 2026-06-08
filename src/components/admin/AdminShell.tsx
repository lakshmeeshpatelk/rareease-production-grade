'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import AdminDashboard  from './AdminDashboard';
import AdminOrders     from './AdminOrders';
import AdminProducts   from './AdminProducts';
import AdminInventory  from './AdminInventory';
import AdminReviews    from './AdminReviews';
import AdminContent    from './AdminContent';
import AdminCustomers  from './AdminCustomers';
import AdminCoupons    from './AdminCoupons';
import AdminCategories from './AdminCategories';
import AdminExchanges         from './AdminExchanges';
import AdminHomepageProducts  from './AdminHomepageProducts';

type Page = 'dashboard' | 'orders' | 'products' | 'inventory' | 'reviews' | 'content' | 'customers' | 'coupons' | 'categories' | 'exchanges' | 'homepage';

const NAV: { id: Page; label: string; section?: string; icon: React.ReactNode }[] = [
  {
    id:'dashboard', label:'Dashboard',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    id:'customers', label:'Customers', section:'Operations',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    id:'orders', label:'Orders',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  },
  {
    id:'exchanges', label:'Exchanges & Cancellations',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
  },
  {
    id:'products', label:'Products',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
  },
  {
    id:'inventory', label:'Inventory',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  },
  {
    id:'reviews', label:'Reviews', section:'Content',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  },
  {
    id:'coupons', label:'Coupons & Discounts',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/><path d="M16 16l-4-4"/></svg>
  },
  {
    id:'categories', label:'Categories',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 10h16M4 14h8M4 18h8"/></svg>
  },
  {
    id:'content', label:'Content & Settings',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  },
  {
    id:'homepage', label:'Homepage & Order', section:'Storefront',
    icon:<svg className="adm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
];

const PAGE_TITLES: Record<Page, string> = {
  dashboard:'Dashboard', orders:'Orders', products:'Products',
  inventory:'Inventory', reviews:'Reviews', content:'Content & Settings',
  customers:'Customers', coupons:'Coupons & Discounts', categories:'Categories',
  exchanges:'Exchanges & Cancellations', homepage:'Homepage & Collection Order',
};
const PAGE_SUBS: Record<Page, string> = {
  dashboard:'Overview & alerts', orders:'Manage & track orders', products:'Edit pricing & visibility',
  inventory:'Stock levels per variant', reviews:'Moderate customer reviews',
  content:'Hero, announcements & info', customers:'Customer list & profiles',
  coupons:'Create and manage discount codes', categories:'Edit category names and labels',
  exchanges:'Exchange requests & cancellations per your policy',
  homepage:'Pick which products show on homepage and control display order',
};

interface Props { onLogout: () => void; }

export default function AdminShell({ onLogout }: Props) {
  const [page,     setPage]     = useState<Page>('dashboard');
  const [sideOpen, setSideOpen] = useState(false);
  const { dashboardStats, loadDashboard } = useAdminStore();

  useEffect(() => { setSideOpen(false); }, [page]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const BADGE: Partial<Record<Page, number>> = {
    orders:    dashboardStats?.pending ?? 0,
    reviews:   dashboardStats?.pendingReviews ?? 0,
    inventory: dashboardStats?.lowStock.filter(i => i.qty === 0).length ?? 0,
    exchanges: dashboardStats?.pendingExchanges ?? 0,
  };

  const renderPage = () => {
    switch (page) {
      case 'categories':  return <AdminCategories />;
      case 'coupons':     return <AdminCoupons />;
      case 'customers':   return <AdminCustomers />;
      case 'dashboard':   return <AdminDashboard onNav={(p) => setPage(p as Page)} />;
      case 'orders':      return <AdminOrders />;
      case 'products':    return <AdminProducts />;
      case 'inventory':   return <AdminInventory />;
      case 'reviews':     return <AdminReviews />;
      case 'content':     return <AdminContent />;
      case 'exchanges':   return <AdminExchanges />;
      case 'homepage':    return <AdminHomepageProducts />;
    }
  };

  let lastSection = '';

  return (
    <div className="adm-root">
      {sideOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:99, WebkitBackdropFilter:'blur(4px)', backdropFilter:'blur(4px)' }}
          onClick={() => setSideOpen(false)} />
      )}

      <button className="adm-mobile-toggle" onClick={() => setSideOpen(p => !p)} aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <aside className={`adm-sidebar${sideOpen ? ' open' : ''}`}>
        <div className="adm-sidebar-logo">
          <div><div className="adm-sidebar-logo-mark">RARE EASE</div></div>
          <span className="adm-sidebar-logo-badge">ADMIN</span>
        </div>

        <nav className="adm-nav">
          {NAV.map(item => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;
            const badge = BADGE[item.id];
            return (
              <div key={item.id}>
                {showSection && <div className="adm-nav-section-label">{item.section}</div>}
                <button className={`adm-nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
                  {item.icon}
                  {item.label}
                  {badge && badge > 0 && <span className="adm-nav-badge">{badge}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-signout-btn" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-header">
          <div className="adm-header-left">
            <div>
              <div className="adm-header-page">{PAGE_TITLES[page]}</div>
              <div className="adm-header-sub">{PAGE_SUBS[page]}</div>
            </div>
          </div>
          <div className="adm-header-right">
            <a href="/" target="_blank" rel="noopener noreferrer" className="adm-header-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View Store
            </a>
          </div>
        </header>

        <main className="adm-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}