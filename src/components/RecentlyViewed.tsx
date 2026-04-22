'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, CAT_GRADIENTS } from '@/lib/utils';
import { Product } from '@/types';

const STORAGE_KEY = 'rareease-recently-viewed';
const MAX_ITEMS = 4;

// Exported so ProductOverlay can call it
export function trackProductView(productId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const updated = [productId, ...ids.filter(id => id !== productId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RecentlyViewed() {
  const { openProductOverlay } = useUIStore();
  const { getByIds } = useProductsStore();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const ids: string[] = JSON.parse(raw);
        const found = getByIds(ids);
        setProducts(found);
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
        {products.map((p, i) => {
          const grads = CAT_GRADIENTS[p.category_id] ?? CAT_GRADIENTS['cat-1'];
          const bg = grads[i % grads.length];
          return (
            <button
              key={p.id}
              className="rv-card"
              onClick={() => openProductOverlay(p)}
              aria-label={p.name}
            >
              <div className="rv-card-img" style={{ background: bg }}>
                <span className="rv-card-init">
                  {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                </span>
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
