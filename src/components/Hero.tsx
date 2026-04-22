'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';

const DEFAULT_SLIDES = [
  { src: '/hero/slide-1.svg', label: 'Drift Culture',   sub: "Women's Combo Set",            ctaText: 'Shop Now', ctaLink: '#shop', active: true },
  { src: '/hero/slide-2.svg', label: 'Never Stop',      sub: "Women's Oversized Tee — Back", ctaText: 'Shop Now', ctaLink: '#shop', active: true },
  { src: '/hero/slide-3.svg', label: 'Street Core',     sub: "Women's Combo — Side",         ctaText: 'Shop Now', ctaLink: '#shop', active: true },
  { src: '/hero/slide-4.svg', label: 'Graphic Archive', sub: "Women's Oversized Tee",        ctaText: 'Shop Now', ctaLink: '#shop', active: true },
  { src: '/hero/slide-5.svg', label: 'Surf California', sub: "Men's Oversized Tee",          ctaText: 'Shop Now', ctaLink: '#shop', active: true },
  // slide-6 (Heartbeat) omitted — the image file does not exist in public/hero/.
  // Add public/hero/slide-6.svg first, then re-add the entry here and in adminData.ts.
];

async function fetchSlidesFromSupabase() {
  try {
    const { getClient } = await import('@/lib/supabase');
    const { data } = await getClient()
      .from('site_settings')
      .select('value')
      .eq('key', 'hero_slides')
      .single();
    if (!data?.value) return null;
    const parsed: typeof DEFAULT_SLIDES = JSON.parse(data.value as string);
    const active = parsed.filter(s => s.active);
    return active.length > 0 ? active : null;
  } catch {
    return null;
  }
}

const INTERVAL = 4000;

export default function Hero() {
  const { openFullCollection } = useUIStore();
  const [slides, setSlides] = useState<typeof DEFAULT_SLIDES>(
    () => DEFAULT_SLIDES.filter(s => s.active)
  );
  const SLIDES = slides;
  const slideCount = SLIDES.length;
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(new Array(slideCount).fill(false));
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    clearTimeout(timerRef.current);
  }, []);

  const goNext = useCallback(() => {
    setActive(p => (p + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setActive(p => (p - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // Auto-advance
  useEffect(() => {
    timerRef.current = setTimeout(goNext, INTERVAL);
    return () => clearTimeout(timerRef.current);
  }, [active, goNext]);

  // Fetch slides from Supabase on mount — admin changes are reflected here
  useEffect(() => {
    fetchSlidesFromSupabase().then(remote => {
      if (remote) { setSlides(remote); setActive(0); }
    });
  }, []);

  // Preload all images
  useEffect(() => {
    SLIDES.forEach((slide, i) => {
      const img = new Image();
      img.src = slide.src;
      img.onload = () => setLoaded(prev => { const n = [...prev]; n[i] = true; return n; });
    });
  // SLIDES reference is stable per render — only re-run when slide count changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount]);

  const scrollToTrending = () => {
    document.getElementById('top-sellers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="h-root"
      onTouchStart={e => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        if (dy > 40) return; // vertical scroll — ignore
        if (Math.abs(dx) > 40) dx < 0 ? goNext() : goPrev();
      }}
    >
      {/* ── Image slides — stacked, fade between ── */}
      <div className="h-slides">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`h-slide${i === active ? ' h-slide--active' : ''}`}
            aria-hidden={i !== active}
          >
            {/* Shimmer skeleton shown until image loads */}
            {!loaded[i] && (
              <div className="h-slide-skeleton" aria-hidden="true" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.label}
              className={`h-slide-img${loaded[i] ? ' h-slide-img--loaded' : ''}`}
              draggable={false}
              {...(i === 0 ? { fetchPriority: 'high', loading: 'eager' } : { loading: 'lazy' })}
            />
            {/* Dark gradient overlay — bottom heavy so text reads */}
            <div className="h-slide-overlay" />
          </div>
        ))}
      </div>

      {/* ── Top bar: eyebrow ── */}
      <div className="h-topbar">
        <div className="h-eyebrow-pill">
          <span className="h-eyebrow-dot" />
          SS25 · Now Live
        </div>
      </div>

      {/* ── Bottom content overlay ── */}
      <div className="h-content">

        {/* Current slide label */}
        <div className="h-slide-label">
          <span className="h-slide-label-name">{SLIDES[active].label}</span>
          <span className="h-slide-label-sep">·</span>
          <span className="h-slide-label-sub">{SLIDES[active].sub}</span>
        </div>

        {/* Main headline */}
        <h1 className="h-headline">
          WEAR<br />THE<br />RARE.
        </h1>

        {/* CTAs */}
        <div className="h-cta">
          <button className="h-btn-primary" onClick={scrollToTrending}>Shop Now</button>
          <button className="h-btn-ghost" onClick={openFullCollection}>All Drops</button>
        </div>

        {/* Dot indicators + counter */}
        <div className="h-indicator">
          <div className="h-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`h-dot${i === active ? ' h-dot--active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <span className="h-counter">
            <strong>{String(active + 1).padStart(2, '0')}</strong>
            <span className="h-counter-sep" />
            {String(SLIDES.length).padStart(2, '0')}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-progress-track">
          <div key={active} className="h-progress-fill" />
        </div>
      </div>
    </section>
  );
}