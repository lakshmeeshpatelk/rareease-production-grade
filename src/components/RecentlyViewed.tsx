'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { Product } from '@/types';

const STORAGE_KEY = 'rareease-recently-viewed';
const MAX_ITEMS   = 4;

export function trackProductView(productId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw     = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const updated = [productId, ...ids.filter(id => id !== productId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RecentlyViewed() {
  const { openProductOverlay } = useUIStore();
  const { getByIds }           = useProductsStore();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const ids: string[] = JSON.parse(raw);
        setProducts(getByIds(ids));
      } catch {}
    };
    load();
    window.addEventListener('storage', load);
    const t = setTimeout(load, 300);
    return () => { window.removeEventListener('storage', load); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (products.length === 0) return null;

  return (
    <section className="rv-section">
      <div className="rv-header">
        <div className="section-label">Your History</div>
        <h2 className="rv-title">Recently Viewed</h2>
      </div>

      <div className="rv-grid">
        {products.map(p => {
          const imgs   = getProductImages(p);
          const hasImg = !!imgs.primary;
          return (
            <button
              key={p.id}
              className="rv-card"
              onClick={() => openProductOverlay(p)}
              aria-label={p.name}
            >
              <div className="rv-card-img">
                {hasImg ? (
                  <Image
                    src={imgs.primary!}
                    alt={p.name}
                    fill
                    sizes="(max-width:768px) 45vw, 200px"
                    style={{ objectFit: 'cover', objectPosition: 'top center' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg,#1a1a1a,#111)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: 28, fontWeight: 900,
                      color: 'rgba(255,255,255,0.1)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {getProductInitials(p)}
                    </span>
                  </div>
                )}
                {/* Bottom fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  pointerEvents: 'none',
                }} />
              </div>

              <div className="rv-card-info">
                <div className="rv-card-name">{p.name}</div>
                <div className="rv-card-price">{formatPrice(p.price)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
