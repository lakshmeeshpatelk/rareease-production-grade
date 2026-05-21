'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

export default function RecommendedProducts({ products }: Props) {
  if (!products.length) return null;

  return (
    <section className="rec-section" aria-label="Recommended products">
      {/* ── Section header ── */}
      <div className="rec-header">
        <div className="rec-header-left">
          <span className="rec-eyebrow">Curated For You</span>
          <h2 className="rec-title">You May Also Like</h2>
        </div>
        <Link href="/#shop" className="rec-see-all" aria-label="Browse all products">
          <span>All Products</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* ── Scroll track (carousel on mobile, grid on desktop) ── */}
      <div className="rec-track" role="list">
        {products.map((p) => {
          const imgs     = getProductImages(p);
          const discount = p.original_price && p.original_price > p.price
            ? Math.round((1 - p.price / p.original_price) * 100)
            : 0;

          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="rec-card"
              role="listitem"
              aria-label={`${p.name} — ${formatPrice(p.price)}`}
            >
              {/* ── Image container ── */}
              <div className="rec-img-wrap">
                {imgs.primary ? (
                  <Image
                    src={imgs.primary}
                    alt={p.name}
                    fill
                    sizes="(max-width: 500px) 44vw, (max-width: 768px) 30vw, 280px"
                    style={{ objectFit: 'cover' }}
                    draggable={false}
                  />
                ) : (
                  <div className="rec-img-placeholder" aria-hidden="true">
                    {getProductInitials(p)}
                  </div>
                )}

                {/* Discount badge */}
                {discount > 0 && (
                  <div className="rec-badge" aria-label={`${discount}% off`}>
                    −{discount}%
                  </div>
                )}

                {/* Product badge (e.g. "New", "Best Seller") */}
                {p.badge && !discount && (
                  <div className="rec-badge rec-badge--label">{p.badge}</div>
                )}

                {/* Quick-view affordance */}
                <div className="rec-hover-cta" aria-hidden="true">
                  <span>Quick View</span>
                </div>
              </div>

              {/* ── Card info ── */}
              <div className="rec-info">
                <p className="rec-name">{p.name}</p>
                <div className="rec-price-row">
                  <span className="rec-price">{formatPrice(p.price)}</span>
                  {p.original_price && p.original_price > p.price && (
                    <del className="rec-orig">{formatPrice(p.original_price)}</del>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}