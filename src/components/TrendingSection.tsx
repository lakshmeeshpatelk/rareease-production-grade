'use client';

import Image from 'next/image';
import { useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice } from '@/lib/utils';
import { getProductImages, getProductInitials } from '@/lib/productImage';

const RANK_COLORS = ['#FFFFFF', '#E8E8E8', '#BBBBBB', '#AAAAAA', '#CCCCCC'];

export default function TrendingSection() {
  const { openProductOverlay } = useUIStore();
  const { products: allProducts } = useProductsStore();

  const BASE = allProducts.filter(p => p.is_active).slice(0, 5);
  const LOOP = BASE.length > 0 ? [...BASE, ...BASE, ...BASE] : [];

  const scrollRef    = useRef<HTMLDivElement>(null);
  const animFrame    = useRef<number>();
  const isPaused     = useRef(false);
  const dragStartX   = useRef(0);
  const dragStartY   = useRef(0);
  const dragScrollLeft = useRef(0);
  const didDrag      = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const oneSetW = el.scrollWidth / 3;
      el.scrollLeft = oneSetW;
    });
    let running = true;
    const tick = () => {
      if (!running) return;
      const el2 = scrollRef.current;
      if (el2 && !isPaused.current) {
        el2.scrollLeft += 0.28;
        const oneSetW = el2.scrollWidth / 3;
        if (el2.scrollLeft >= oneSetW * 2) el2.scrollLeft -= oneSetW;
        if (el2.scrollLeft <= 0)           el2.scrollLeft += oneSetW;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { running = false; if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  // Native touch for iOS passive scroll prevention
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      isPaused.current = true; didDrag.current = false;
      dragStartX.current = e.touches[0].pageX;
      dragStartY.current = e.touches[0].pageY;
      dragScrollLeft.current = el.scrollLeft;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = dragStartX.current - e.touches[0].pageX;
      const dy = Math.abs(dragStartY.current - e.touches[0].pageY);
      if (Math.abs(dx) > dy && Math.abs(dx) > 4) {
        e.preventDefault(); didDrag.current = true;
        el.scrollLeft = dragScrollLeft.current + dx;
      }
    };
    const onTouchEnd = () => {
      setTimeout(() => { isPaused.current = false; }, 1200);
      const oneSetW = el.scrollWidth / 3;
      if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
      if (el.scrollLeft <= 0)           el.scrollLeft += oneSetW;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  const resume = useCallback(() => {
    setTimeout(() => { isPaused.current = false; }, 1200);
    const el = scrollRef.current;
    if (!el) return;
    const oneSetW = el.scrollWidth / 3;
    if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
    if (el.scrollLeft <= 0)           el.scrollLeft += oneSetW;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isPaused.current = true; didDrag.current = false;
    dragStartX.current = e.pageX;
    dragScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPaused.current || !scrollRef.current) return;
    const dx = dragStartX.current - e.pageX;
    if (Math.abs(dx) > 5) didDrag.current = true;
    scrollRef.current.scrollLeft = dragScrollLeft.current + dx;
  }, []);

  return (
    <section className="trend-section" id="trending">
      <div className="trend-header-row">
        <div>
          <div className="section-label">Hot Right Now</div>
          <h2 className="section-title">TRENDING</h2>
        </div>
        <div className="trend-scroll-hint">
          <span className="trend-scroll-arrow">←</span>
          <span className="trend-scroll-text">swipe</span>
          <span className="trend-scroll-arrow">→</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="trend-infinite-wrap"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={resume}
        onMouseLeave={resume}
        style={{ cursor: 'grab' }}
      >
        <div className="trend-infinite-track">
          {LOOP.map((p, i) => {
            const baseIdx = i % BASE.length;
            const imgs = getProductImages(p);
            const hasImg = !!imgs.primary;
            const accentColor = RANK_COLORS[baseIdx % RANK_COLORS.length];

            return (
              <div
                key={`${p.id}-${i}`}
                className="trend-card-new"
                onClick={() => { if (!didDrag.current) openProductOverlay(p); }}
                draggable={false}
              >
                <div className="trend-card-new-img">
                  {hasImg ? (
                    <Image
                      src={imgs.primary!}
                      alt={p.name}
                      fill
                      sizes="280px"
                      style={{ objectFit: 'cover', objectPosition: 'top center' }}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg,#1a1a1a,#0d0d0d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em',
                        color: 'rgba(255,255,255,0.08)', fontFamily: 'var(--font-display)',
                      }}>
                        {getProductInitials(p)}
                      </span>
                    </div>
                  )}

                  {/* Rank badge */}
                  <div className="trend-rank" style={{ background: 'rgba(0,0,0,0.7)', color: accentColor, border: `1px solid ${accentColor}40` }}>
                    #{baseIdx + 1}
                  </div>

                  {/* Bottom fade */}
                  <div className="trend-card-new-gradient" />
                </div>

                <div className="trend-card-new-info">
                  <div className="trend-card-new-name">{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="trend-card-new-price">{formatPrice(p.price)}</div>
                    <div className="trend-card-new-cta">View →</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="trend-progress-row">
        {BASE.map((_, i) => (
          <div key={i} className="trend-progress-dot" />
        ))}
      </div>
    </section>
  );
}
