'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { CAT_GRADIENTS, formatPrice } from '@/lib/utils';

// Bold gradient overlays per card for visual variety
const CARD_THEMES = [
  { overlay: 'linear-gradient(160deg, rgba(195,206,148,0.18) 0%, transparent 60%)', accent: '#FFFFFF' },
  { overlay: 'linear-gradient(160deg, rgba(254,189,166,0.15) 0%, transparent 60%)', accent: '#E8E8E8' },
  { overlay: 'linear-gradient(160deg, rgba(168,196,212,0.15) 0%, transparent 60%)', accent: '#BBBBBB' },
  { overlay: 'linear-gradient(160deg, rgba(212,168,196,0.15) 0%, transparent 60%)', accent: '#AAAAAA' },
  { overlay: 'linear-gradient(160deg, rgba(196,212,168,0.15) 0%, transparent 60%)', accent: '#CCCCCC' },
];

export default function TrendingSection() {
  const { openProductOverlay } = useUIStore();
  const { products: allProducts } = useProductsStore();

  const BASE = allProducts.filter(p => p.category_id === 'cat-1' && p.is_active).slice(0, 5);
  const LOOP = BASE.length > 0 ? [...BASE, ...BASE, ...BASE] : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number>();
  const isPaused = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const didDrag = useRef(false);

  // ── Gentle auto-scroll ────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Wait for render to measure actual widths
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
        if (el2.scrollLeft <= 0) el2.scrollLeft += oneSetW;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { running = false; if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  const resume = useCallback(() => {
    setTimeout(() => { isPaused.current = false; }, 1000);
    const el = scrollRef.current;
    if (!el) return;
    const oneSetW = el.scrollWidth / 3;
    if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
    if (el.scrollLeft <= 0) el.scrollLeft += oneSetW;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isPaused.current = true;
    didDrag.current = false;
    dragStartX.current = e.touches[0].pageX;
    dragScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const dx = dragStartX.current - e.touches[0].pageX;
    if (Math.abs(dx) > 5) didDrag.current = true;
    el.scrollLeft = dragScrollLeft.current + dx;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isPaused.current = true;
    didDrag.current = false;
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

      {/* ── Header ── */}
      <div className="trend-header-row">
        <div>
          <div className="section-label">Hot Right Now</div>
          <h2 className="section-title">TRENDING</h2>
        </div>
        {/* Scroll hint — visible indicator */}
        <div className="trend-scroll-hint">
          <span className="trend-scroll-arrow">←</span>
          <span className="trend-scroll-text">swipe</span>
          <span className="trend-scroll-arrow">→</span>
        </div>
      </div>

      {/* ── Infinite carousel ── */}
      <div
        ref={scrollRef}
        className="trend-infinite-wrap"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={resume}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={resume}
        onMouseLeave={resume}
        style={{ cursor: 'grab' }}
      >
        <div className="trend-infinite-track">
          {LOOP.map((p, i) => {
            const baseIdx = i % BASE.length;
            const bg = (CAT_GRADIENTS['cat-1'] ?? [])[baseIdx] ?? 'linear-gradient(135deg,#0f0f0f,#1a1a1a)';
            const theme = CARD_THEMES[baseIdx];

            return (
              <div
                key={`${p.id}-${i}`}
                className="trend-card-new"
                onClick={() => { if (!didDrag.current) openProductOverlay(p); }}
                draggable={false}
              >
                {/* Visual block */}
                <div className="trend-card-new-img" style={{ background: bg }}>
                  {/* Colour overlay for visual variety */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: theme.overlay,
                    pointerEvents: 'none',
                  }} />

                  {/* Product initials — large */}
                  <span className="trend-card-new-init" style={{ color: theme.accent }}>
                    {p.name.split(' ').map((w: string) => w[0]).join('')}
                  </span>

                  {/* Rank badge */}
                  <div className="trend-rank" style={{ background: theme.accent }}>
                    #{baseIdx + 1}
                  </div>

                  {/* Bottom gradient */}
                  <div className="trend-card-new-gradient" />
                </div>

                {/* Info */}
                <div className="trend-card-new-info">
                  <div className="trend-card-new-name">{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="trend-card-new-price" style={{ color: theme.accent }}>
                      {formatPrice(p.price)}
                    </div>
                    <div className="trend-card-new-cta">View →</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Progress dots (static — just decorative scroll hint) ── */}
      <div className="trend-progress-row">
        {BASE.map((_, i) => (
          <div key={i} className="trend-progress-dot" />
        ))}
      </div>
    </section>
  );
}
