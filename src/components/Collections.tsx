'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'cat-1', slug: 'mens-oversized', name: "Men's Oversized T-Shirt", label: "Men's", description: 'Premium oversized tees for men.', hero_badge: 'MOT', card_class: 'card-street', pattern_class: 'card-pattern-1', created_at: '' },
  { id: 'cat-2', slug: 'womens-oversized', name: "Women's Oversized T-Shirt", label: "Women's", description: 'Premium oversized tees for women.', hero_badge: 'WOT', card_class: 'card-women', pattern_class: 'card-pattern-2', created_at: '' },
  { id: 'cat-3', slug: 'mens-sleeveless', name: "Men's Sleeveless T-Shirt", label: "Men's", description: 'Sleeveless tees for men.', hero_badge: 'MSL', card_class: 'card-drift', pattern_class: 'card-pattern-3', created_at: '' },
  { id: 'cat-4', slug: 'womens-sleeveless', name: "Women's Sleeveless T-Shirt", label: "Women's", description: 'Sleeveless tees for women.', hero_badge: 'WSL', card_class: 'card-archive', pattern_class: 'card-pattern-4', created_at: '' },
  { id: 'cat-5', slug: 'mens-combo', name: "Men's Combo", label: "Men's · 2-Piece Set", description: 'Matching sets for men.', hero_badge: 'MC', card_class: 'card-minimal', pattern_class: 'card-pattern-1', created_at: '' },
  { id: 'cat-6', slug: 'womens-combo', name: "Women's Combo", label: "Women's · 2-Piece Set", description: 'Matching sets for women.', hero_badge: 'WC', card_class: 'card-oversized', pattern_class: 'card-pattern-2', created_at: '' },
];

const CAT_ACCENTS: Record<string, string> = {
  'cat-1': '#FFFFFF', 'cat-2': '#E8E8E8', 'cat-3': '#BBBBBB',
  'cat-4': '#AAAAAA', 'cat-5': '#CCCCCC', 'cat-6': '#B8B8B8',
};

// Triple the array so infinite scroll wraps seamlessly
const LOOP_CATS = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

export default function Collections() {
  const { openCategoryOverlay, openFullCollection } = useUIStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number>();
  const isPaused = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const didDrag = useRef(false);

  // ── Auto scroll ──────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Start at the middle clone so we can loop both ways
    const oneSetW = el.scrollWidth / 3;
    el.scrollLeft = oneSetW;

    let running = true;
    const tick = () => {
      if (!running) return;
      if (!isPaused.current) {
        el.scrollLeft += 0.3; // slow gentle scroll
        if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
        if (el.scrollLeft <= 0) el.scrollLeft += oneSetW;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { running = false; if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  // ── Touch drag ───────────────────────────────────────────────
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

  const onTouchEnd = useCallback(() => {
    setTimeout(() => { isPaused.current = false; }, 800);
    const el = scrollRef.current;
    if (!el) return;
    const oneSetW = el.scrollWidth / 3;
    if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
    if (el.scrollLeft <= 0) el.scrollLeft += oneSetW;
  }, []);

  // ── Mouse drag (desktop) ─────────────────────────────────────
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

  const onMouseUp = useCallback(() => {
    setTimeout(() => { isPaused.current = false; }, 800);
    const el = scrollRef.current;
    if (!el) return;
    const oneSetW = el.scrollWidth / 3;
    if (el.scrollLeft >= oneSetW * 2) el.scrollLeft -= oneSetW;
    if (el.scrollLeft <= 0) el.scrollLeft += oneSetW;
  }, []);

  return (
    <section className="coll-section">
      <div className="coll-header">
        <div>
          <div className="section-label">Browse</div>
          <h2 className="section-title">Collections</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button className="coll-view-all" onClick={openFullCollection}>View All →</button>
          <div className="trend-scroll-hint" style={{ marginBottom: 2 }}>
            <span className="trend-scroll-arrow">←</span>
            <span className="trend-scroll-text">swipe</span>
            <span className="trend-scroll-arrow">→</span>
          </div>
        </div>
      </div>

      {/* Infinite scroll strip */}
      <div
        ref={scrollRef}
        className="coll-infinite-wrap"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: 'pointer' }}
      >
        <div className="coll-infinite-track">
          {LOOP_CATS.map((cat, i) => (
            <button
              key={`${cat.id}-${i}`}
              className="coll-card"
              onClick={() => { if (!didDrag.current) openCategoryOverlay(cat); }}
              draggable={false}
              style={{ '--accent': CAT_ACCENTS[cat.id] } as React.CSSProperties}
            >
              <div className="coll-card-vis">
                <div className="coll-card-badge-text">{cat.hero_badge}</div>
                <div className="coll-card-glow" style={{ background: CAT_ACCENTS[cat.id] }} />
              </div>
              <div className="coll-card-info">
                <div className="coll-card-label">{cat.label}</div>
                <div className="coll-card-name">{cat.name}</div>
              </div>
              <div className="coll-card-arrow">→</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
