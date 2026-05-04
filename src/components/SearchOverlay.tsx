'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useProductsStore } from '@/store/productsStore';
import { formatPrice, CAT_GRADIENTS } from '@/lib/utils';
import { useOverlayHistory } from '@/lib/useOverlayHistory';

const TRENDING = [
  'Urban Flux Tee', 'Block Core Set', 'Oversized Drop',
  'Archive Series', "Women's Edit", 'Street Core',
];

const SEARCH_HISTORY_KEY = 'rareease-search-history';
const MAX_HISTORY = 6;

function saveSearch(term: string) {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const updated = [term, ...prev.filter(t => t !== term)].slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function SearchOverlay() {
  const { isSearchOpen, closeSearch, openProductOverlay } = useUIStore();
  useOverlayHistory(isSearchOpen, closeSearch);
  const { products: allProducts, load, getByIds } = useProductsStore();
  const [query,       setQuery]       = useState('');
  const [focused,     setFocused]     = useState(false);
  const [recentIds,   setRecentIds]   = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rareease-recently-viewed');
      if (raw) setRecentIds(JSON.parse(raw).slice(0, 4));
    } catch {}
    setSearchHistory(loadSearchHistory());
  }, [isSearchOpen]);

  const recentProducts = getByIds(recentIds);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      const t = setTimeout(() => { inputRef.current?.focus(); setFocused(true); }, 80);
      return () => clearTimeout(t);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const results = useMemo(() => query.trim().length >= 2
    ? allProducts.filter((p) =>
        p.is_active && (
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.tagline?.toLowerCase().includes(query.toLowerCase())
        )
      ).slice(0, 9)
    : [], [query, allProducts]);

  const featuredProducts = useMemo(() =>
    allProducts.filter(p => p.is_featured && p.is_active).slice(0, 4),
  [allProducts]);

  const hasResults = results.length > 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.97)',
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)',
            zIndex: 700,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'calc(var(--nav-h) + 32px) var(--side, 18px) calc(var(--mobile-nav-h, 80px) + 16px)',
            overflowY: 'auto',
          }}
        >
          {/* ── CLOSE BUTTON ── */}
          <button
            onClick={closeSearch}
            style={{
              position: 'absolute', top: 'calc(var(--nav-h, 60px) + 8px)', right: 'var(--side, 18px)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'var(--mid-gray)', background: 'none', border: 'none',
              transition: 'color 0.2s', minHeight: 44, minWidth: 44,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--mid-gray)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
            Esc
          </button>

          {/* ── EYEBROW ── */}
          <div style={{
            fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase',
            color: 'var(--sage)', marginBottom: 24,
          }}>
            Search Collection
          </div>

          {/* ── INPUT ── */}
          <div style={{
            width: '100%', maxWidth: 680,
            position: 'relative', marginBottom: 48,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              borderBottom: `1px solid ${focused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
              transition: 'border-color 0.3s',
              paddingBottom: 8,
            }}>
              <svg
                width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="What are you looking for?"
                inputMode="search"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  flex: 1,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--white)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(28px, 4.5vw, 52px)',
                  letterSpacing: '0.03em',
                  WebkitTextSizeAdjust: '100%',
                } as React.CSSProperties}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--mid-gray)', fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.2s', flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--mid-gray)')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Result count */}
            {hasResults && (
              <div style={{
                marginTop: 12, fontSize: 11, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--mid-gray)',
              }}>
                <strong style={{ color: 'var(--white)' }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* ── RECENTLY VIEWED (when no query) ── */}
          {!query && recentProducts.length > 0 && (
            <div style={{ width: '100%', maxWidth: 680, marginBottom: 40 }}>
              <div className="search-results-label">Recently Viewed</div>
              <div className="search-results-grid">
                {recentProducts.map((p, i) => {
                  const bg = (CAT_GRADIENTS[p.category_id] ?? [])[i] ?? 'linear-gradient(135deg,#111,#1e1e1e)';
                  return (
                    <button
                      key={p.id}
                      onClick={() => { if (query.trim()) { saveSearch(query.trim()); setSearchHistory(loadSearchHistory()); } openProductOverlay(p); closeSearch(); }}
                      style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div style={{ background: bg, aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,4vw,32px)', color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.1)', userSelect: 'none' }}>
                          {p.name.split(' ').map((w: string) => w[0]).join('').slice(0,3)}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{p.name}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--sage)', letterSpacing: '0.06em' }}>{formatPrice(p.price)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RESULTS OR SUGGESTIONS ── */}
          <div style={{ width: '100%', maxWidth: 680 }}>
            {hasResults ? (
              <>
                <div style={{
                  fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: 'var(--mid-gray)', marginBottom: 16,
                }}>
                  Results
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 2,
                }}>
                  {results.map((product, i) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => { if (query.trim()) { saveSearch(query.trim()); setSearchHistory(loadSearchHistory()); } openProductOverlay(product); closeSearch(); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        textAlign: 'left',
                        transition: 'background 0.2s, border-color 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <div style={{
                        width: 42, height: 52, flexShrink: 0,
                        background: 'linear-gradient(135deg, #111, #1c1c1c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 13,
                          color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em',
                        }}>
                          {product.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
                        </span>
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--white)',
                          marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mid-gray)' }}>
                          {formatPrice(product.price)}
                        </div>
                        {product.badge && (
                          <div style={{
                            display: 'inline-block',
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.18em',
                            textTransform: 'uppercase', padding: '2px 6px',
                            background: product.badge === 'New' ? 'var(--sage)'
                              : product.badge === 'Limited' ? 'var(--blush)' : 'var(--white)',
                            color: 'var(--black)', marginTop: 4,
                          }}>
                            {product.badge}
                          </div>
                        )}
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : query.trim().length >= 2 ? (
              /* No results */
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 48, color: 'transparent',
                  WebkitTextStroke: '1px rgba(255,255,255,0.06)',
                  marginBottom: 16,
                }}>
                  ?
                </div>
                <div style={{ fontSize: 14, color: 'var(--mid-gray)' }}>
                  No results for <strong style={{ color: 'var(--white)' }}>&ldquo;{query}&rdquo;</strong>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                  Try a different search or browse collections below
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Recent Searches — only shown if history exists */}
                {searchHistory.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'var(--mid-gray)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span>Recent Searches</span>
                      <button
                        onClick={() => { localStorage.removeItem(SEARCH_HISTORY_KEY); setSearchHistory([]); }}
                        style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', fontSize:10, letterSpacing:'0.1em', cursor:'pointer', textDecoration:'underline' }}
                      >
                        Clear
                      </button>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {searchHistory.map(term => (
                        <button key={term} className="search-trending-chip"
                          onClick={() => setQuery(term)}
                          style={{ display:'flex', alignItems:'center', gap:6 }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                <div>
                  <div style={{ fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'var(--mid-gray)', marginBottom:14 }}>
                    Trending
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {TRENDING.map((tag) => (
                      <button key={tag} className="search-trending-chip" onClick={() => setQuery(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All products quick grid */}
                <div>
                  <div style={{
                    fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
                    color: 'var(--mid-gray)', marginBottom: 14,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>Featured Pieces</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {featuredProducts.length} items
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {featuredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => { if (query.trim()) { saveSearch(query.trim()); setSearchHistory(loadSearchHistory()); } openProductOverlay(product); closeSearch(); }}
                        style={{
                          flex: '1 1 140px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      >
                        <div style={{
                          width: 36, height: 44,
                          background: 'linear-gradient(135deg, #111, #1c1c1c)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
                            {product.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--white)', marginBottom: 2, lineHeight: 1.2 }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--mid-gray)' }}>
                            {formatPrice(product.price)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}