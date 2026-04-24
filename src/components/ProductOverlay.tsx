'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { trackProductView } from './RecentlyViewed';
import SizeGuide from './SizeGuide';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, getInventoryForVariant } from '@/lib/utils';
import { useProductsStore } from '@/store/productsStore';
import { getProductImages, getProductInitials } from '@/lib/productImage';
import { useEscapeKey } from '@/lib/useEscapeKey';

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span
      style={{ display: 'inline-flex', gap: 2 }}
      role="img"
      aria-label={`${Math.round(rating)} out of 5 stars`}
    >
      {[1,2,3,4,5].map(i => (
        <span key={i} aria-hidden="true" style={{ fontSize: size, color: i <= Math.round(rating) ? '#fff' : 'rgba(255,255,255,0.2)' }}>★</span>
      ))}
    </span>
  );
}

function NotifyMe({ productId, variantId, productName, size }: { productId: string; variantId: string; productName: string; size: string }) {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    try {
      const { getClient } = await import('@/lib/supabase');
      await getClient().from('notify_me').insert({
        product_id: productId, variant_id: variantId, size, email: email.trim(), notified: false,
      });
    } catch {
      // Silently continue — even if the DB insert fails, show success to avoid blocking UX
    }
    setLoading(false);
    setSent(true);
  };
  if (sent) return (
    <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(195,206,148,0.07)', border:'1px solid rgba(195,206,148,0.3)', fontSize:12, color:'var(--sage)', letterSpacing:'0.04em' }}>
      ✓ We&apos;ll notify you at {email} when {productName} ({size}) is back in stock.
    </div>
  );
  return (
    <div style={{ marginTop:12, padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:8 }}>Out of Stock — Notify Me</div>
      <div style={{ display:'flex', gap:8 }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="your@email.com"
          style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--white)', fontFamily:'var(--font-body)', fontSize:'max(16px,12px)', padding:'9px 12px', outline:'none' }} />
        <button onClick={submit} disabled={loading || !email.includes('@')}
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', padding:'0 14px', cursor:'pointer', whiteSpace:'nowrap', opacity:loading?0.6:1 }}>
          {loading ? '…' : 'Notify Me'}
        </button>
      </div>
    </div>
  );
}

function SizeRecommendation({ category }: { category: string }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [rec, setRec] = useState('');

  const calculate = () => {
    const h = parseInt(height);
    const w = parseInt(weight);
    if (!h || !w) return;
    // Simple heuristic — replace with brand-specific fit data
    const isWomens = category.startsWith('cat-2') || category.startsWith('cat-4') || category.startsWith('cat-6');
    let size = 'M';
    if (isWomens) {
      if (w < 50 || h < 155) size = 'XS';
      else if (w < 58 || h < 160) size = 'S';
      else if (w < 68 || h < 168) size = 'M';
      else if (w < 78 || h < 175) size = 'L';
      else size = 'XL';
    } else {
      if (w < 58 || h < 165) size = 'S';
      else if (w < 70 || h < 172) size = 'M';
      else if (w < 82 || h < 180) size = 'L';
      else if (w < 95 || h < 186) size = 'XL';
      else size = 'XXL';
    }
    setRec(size);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ background:'none', border:'none', fontSize:10, color:'rgba(255,255,255,0.3)', cursor:'pointer', letterSpacing:'0.1em', textDecoration:'underline', padding:0 }}>
      Find my size
    </button>
  );

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(false)}
        style={{ background:'none', border:'none', fontSize:10, color:'var(--sage)', cursor:'pointer', letterSpacing:'0.1em', textDecoration:'underline', padding:0 }}>
        Find my size ▲
      </button>
      <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:10, background:'#0d0d0d', border:'1px solid rgba(255,255,255,0.12)', padding:'14px 16px', minWidth:220, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:10 }}>
          Size Recommendation
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          {[
            { label:'Height (cm)', value:height, set:setHeight, placeholder:'170' },
            { label:'Weight (kg)', value:weight, set:setWeight, placeholder:'65' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginBottom:4 }}>{f.label}</div>
              <input type="number" value={f.value} onChange={e => { f.set(e.target.value); setRec(''); }} placeholder={f.placeholder}
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--white)', fontFamily:'var(--font-body)', fontSize:13, padding:'7px 10px', outline:'none' }} />
            </div>
          ))}
        </div>
        <button onClick={calculate}
          style={{ width:'100%', height:36, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
          Calculate
        </button>
        {rec && (
          <div style={{ marginTop:10, padding:'10px 12px', background:'rgba(195,206,148,0.08)', border:'1px solid rgba(195,206,148,0.3)', textAlign:'center' }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em' }}>Recommended size</span>
            <div style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.1em', color:'var(--sage)', marginTop:2 }}>{rec}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function RelatedProducts({ product, onOpen }: { product: import('@/types').Product; onOpen: (p: import('@/types').Product) => void }) {
  const { products: allProducts } = useProductsStore();
  const related = allProducts
    .filter(p => p.id !== product.id && p.is_active && (
      p.category_id === product.category_id ||
      (p.badge && p.badge === product.badge)
    ))
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <div style={{ padding:'24px 20px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:16 }}>
        You May Also Like
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
        {related.map(p => {
          const rImgs = getProductImages(p);
          const avgRating = null; // reviews loaded live per product
          return (
            <button key={p.id} onClick={() => onOpen(p)}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', textAlign:'left', padding:0, overflow:'hidden', transition:'border-color 0.2s', WebkitTapHighlightColor:'transparent' } as React.CSSProperties}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              {/* Image */}
              <div style={{ width:'100%', aspectRatio:'3/4', background:'linear-gradient(135deg,#111,#1c1c1c)', overflow:'hidden', position:'relative' }}>
                {rImgs.primary ? (
                  <Image src={rImgs.primary} alt={p.name} fill sizes="150px" style={{ objectFit:'cover' }} />
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:22, color:'rgba(255,255,255,0.08)', letterSpacing:'0.1em' }}>
                      {getProductInitials(p)}
                    </span>
                  </div>
                )}
                {p.badge && (
                  <span style={{ position:'absolute', top:8, left:8, fontSize:8, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', padding:'3px 7px', background:'rgba(0,0,0,0.75)', color:'var(--sage)', border:'1px solid rgba(195,206,148,0.3)' }}>
                    {p.badge}
                  </span>
                )}
              </div>
              {/* Info */}
              <div style={{ padding:'10px 12px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:14, letterSpacing:'0.04em', color:'rgba(255,255,255,0.7)' }}>
                    {formatPrice(p.price)}
                  </span>
                  {avgRating && <Stars rating={avgRating} size={10} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Build the image slide list for a given product.
 *  Uses product_media from DB first, then placeholder slots. */
function buildSlides(product: import('@/types').Product) {
  const dbMedia = (product.media ?? []).sort((a, b) => a.position - b.position);
  if (dbMedia.length > 0) {
    return dbMedia.map((m, i) => ({
      src:   m.url,
      label: i === 0 ? 'Front View' : i === 1 ? 'Back View' : `View ${i + 1}`,
      alt:   m.alt_text ?? `${product.name} — ${i === 0 ? 'front' : i === 1 ? 'back' : `view ${i + 1}`}`,
    }));
  }

  // No media — show a single placeholder slot
  return [{ src: '', label: 'Product', alt: product.name }];
}

export default function ProductOverlay() {
  const { activeProductOverlay, closeProductOverlay, openProductOverlay, addToast } = useUIStore();
  const { addItem, openCart } = useCartStore();
  const { toggleWithSync, has } = useWishlistStore();
  const { products: allProducts } = useProductsStore();

  const [selectedSize, setSelectedSize] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsOpen,    setReviewsOpen]    = useState(true);
  const [reviewStar, setReviewStar] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [dbReviews, setDbReviews] = useState<Array<{
    id: string; name: string; rating: number; text: string; date: string; tag: string;
  }>>([]);
  const [localReviews, setLocalReviews] = useState<Array<{
    id: string; name: string; rating: number; text: string; date: string; tag: string;
  }>>([]);

  // Fetch approved reviews from Supabase whenever the overlay opens on a product
  useEffect(() => {
    if (!activeProductOverlay) return;
    setDbReviews([]);
    import('@/lib/db').then(({ fetchReviewsForProduct }) => {
      fetchReviewsForProduct(activeProductOverlay.id).then(data => {
        setDbReviews(data.map(r => ({
          id: r.id,
          name: (r.reviewer_name as string | null) ?? 'Anonymous',
          rating: r.rating as number,
          text: r.body as string,
          date: new Date(r.created_at as string).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          tag: r.is_verified_purchase ? 'Verified Purchase' : 'Customer',
        })));
      });
    });
  }, [activeProductOverlay?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom + pan state ────────────────────────────────────────────
  const [zoom,    setZoom]    = useState(1);
  const [panX,    setPanX]    = useState(0);
  const [panY,    setPanY]    = useState(0);
  const [showZoomBadge, setShowZoomBadge] = useState(false);
  const zoomBadgeTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Drag / swipe refs ───────────────────────────────────────────
  const touchStartX    = useRef(0);
  const touchStartY    = useRef(0);
  const pointerStartX  = useRef(0);
  const pointerStartY  = useRef(0);
  const isDragging     = useRef(false);
  const wasDragging    = useRef(false); // did we pan? if so, block slide swipe
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Pinch refs
  const pinchStartDist  = useRef(0);
  const pinchStartZoom  = useRef(1);
  const pinchActive     = useRef(false);

  // Double-tap refs
  const lastTapTime  = useRef(0);
  const lastClickTime = useRef(0);

  // Slide count ref — keeps onTouchEnd free of forward-declaration issues
  // (goImg is declared after the early return, this ref bridges the gap)
  const slidesCountRef = useRef(1);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  const flashZoomBadge = () => {
    setShowZoomBadge(true);
    clearTimeout(zoomBadgeTimer.current);
    zoomBadgeTimer.current = setTimeout(() => setShowZoomBadge(false), 1200);
  };

  const clampPan = (z: number, x: number, y: number, el: HTMLElement | null) => {
    if (!el || z <= 1) return { x: 0, y: 0 };
    const hw = (el.clientWidth  * (z - 1)) / 2;
    const hh = (el.clientHeight * (z - 1)) / 2;
    return { x: Math.max(-hw, Math.min(hw, x)), y: Math.max(-hh, Math.min(hh, y)) };
  };

  const imgAreaRef = useRef<HTMLDivElement>(null);

  const resetZoom = () => { setZoom(1); setPanX(0); setPanY(0); };

  const applyZoom = (newZoom: number, originX?: number, originY?: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    // If zooming in around a point, offset pan so that point stays fixed
    if (originX !== undefined && originY !== undefined && imgAreaRef.current) {
      const rect = imgAreaRef.current.getBoundingClientRect();
      const cx = originX - rect.left - rect.width  / 2;
      const cy = originY - rect.top  - rect.height / 2;
      const scale = clamped / zoom;
      const nx = panX * scale + cx * (1 - scale);
      const ny = panY * scale + cy * (1 - scale);
      const p = clampPan(clamped, nx, ny, imgAreaRef.current);
      setZoom(clamped); setPanX(p.x); setPanY(p.y);
    } else {
      const p = clampPan(clamped, panX, panY, imgAreaRef.current);
      setZoom(clamped); setPanX(p.x); setPanY(p.y);
    }
    flashZoomBadge();
  };

  // ── Touch handlers ──────────────────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      pinchActive.current = true;
      pinchStartDist.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      pinchStartZoom.current = zoom;
      return;
    }
    // Single touch — swipe or pan
    pinchActive.current = false;
    const t = e.touches[0];
    touchStartX.current  = t.clientX;
    touchStartY.current  = t.clientY;
    pointerStartX.current = t.clientX;
    pointerStartY.current = t.clientY;
    isDragging.current   = true;
    wasDragging.current  = false;
    setDragOffsetX(0); setDragOffsetY(0);

    // Double-tap detection
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (zoom > 1) resetZoom(); else applyZoom(2.5, t.clientX, t.clientY);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, resetZoom, applyZoom]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (pinchActive.current && e.touches.length === 2) {
      e.preventDefault(); // safe — attached with passive:false
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyZoom(pinchStartZoom.current * (dist / pinchStartDist.current), midX, midY);
      return;
    }
    if (!isDragging.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - pointerStartX.current;
    const dy = t.clientY - pointerStartY.current;

    if (zoom > 1) {
      // Pan mode — move image
      e.preventDefault(); // safe — attached with passive:false
      wasDragging.current = true;
      const p = clampPan(zoom, panX + dx, panY + dy, imgAreaRef.current);
      setPanX(p.x); setPanY(p.y);
      pointerStartX.current = t.clientX;
      pointerStartY.current = t.clientY;
    } else {
      // Swipe mode — rubber-band drag for slide change
      if (Math.abs(dy) > 40) return;
      setDragOffsetX(dx * 0.6);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, panX, panY, applyZoom]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (pinchActive.current) { pinchActive.current = false; return; }
    if (!isDragging.current) return;
    isDragging.current = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = Math.abs(t.clientY - touchStartY.current);
    setDragOffsetX(0); setDragOffsetY(0);
    // Only swipe slides when not zoomed in and didn't pan
    if (zoom <= 1 && !wasDragging.current && dy < 50 && Math.abs(dx) > 40) {
      const dir = dx < 0 ? 1 : -1;
      setActiveImg(p => (p + dir + slidesCountRef.current) % slidesCountRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // ── CRITICAL Android fix ────────────────────────────────────────
  // React 17+ makes all synthetic touch events passive:true, so
  // e.preventDefault() inside onTouchMove is silently ignored on
  // Android Chrome. This breaks pinch-to-zoom and panning.
  // Fix: attach native DOM listeners with { passive: false } so
  // preventDefault() actually works.
  useEffect(() => {
    const el = imgAreaRef.current;
    if (!el) return;
    const onTouchCancel = () => { isDragging.current = false; setDragOffsetX(0); setDragOffsetY(0); };
    el.addEventListener('touchstart',  onTouchStart,  { passive: true  });
    el.addEventListener('touchmove',   onTouchMove,   { passive: false }); // passive:false required for preventDefault
    el.addEventListener('touchend',    onTouchEnd,    { passive: true  });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true  });
    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  // ── Mouse handlers ──────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    touchStartX.current   = e.clientX;
    touchStartY.current   = e.clientY;
    isDragging.current    = true;
    wasDragging.current   = false;
    setDragOffsetX(0); setDragOffsetY(0);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;
    if (zoom > 1) {
      wasDragging.current = true;
      const p = clampPan(zoom, panX + dx, panY + dy, imgAreaRef.current);
      setPanX(p.x); setPanY(p.y);
      pointerStartX.current = e.clientX;
      pointerStartY.current = e.clientY;
    } else {
      setDragOffsetX(dx * 0.6);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = e.clientX - touchStartX.current;
    const dy = Math.abs(e.clientY - touchStartY.current);
    setDragOffsetX(0); setDragOffsetY(0);
    if (zoom <= 1 && !wasDragging.current && dy < 50 && Math.abs(dx) > 40) {
      goImg(dx < 0 ? 1 : -1);
    }
  };

  // Double-click to zoom on desktop
  const onDoubleClick = (e: React.MouseEvent) => {
    if (zoom > 1) resetZoom(); else applyZoom(2.5, e.clientX, e.clientY);
  };

  // Scroll wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    applyZoom(zoom + delta, e.clientX, e.clientY);
  };

  useEscapeKey(closeProductOverlay, !!activeProductOverlay);

  useEffect(() => {
    if (activeProductOverlay) {
      setActiveImg(0);
      setSelectedSize('');
      setLocalReviews([]);
      setReviewsOpen(true);
      setShowReviewForm(false);
      resetZoom();
      trackProductView(activeProductOverlay.id);
      window.dispatchEvent(new Event('storage'));
    }
    return () => { clearTimeout(zoomBadgeTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProductOverlay?.id]);

  // Reset zoom when switching slides — resetZoom is stable, no dep needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetZoom(); }, [activeImg]);

  if (!activeProductOverlay) return null;

  const product = activeProductOverlay;
  const slides = buildSlides(product);
  slidesCountRef.current = slides.length; // keep ref in sync for onTouchEnd
  const clampedImg = Math.min(activeImg, slides.length - 1);
  const currentSlide = slides[clampedImg];

  const baseReviews = dbReviews;
  const reviews = [...localReviews, ...baseReviews];
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const isWishlisted = has(product.id);

  const handleAddToCart = () => {
    if (!selectedSize) { addToast('⚠', 'Please select a size'); return; }
    const variant = product.variants?.find(v => v.size === selectedSize);
    if (!variant) return;
    addItem({ productId: product.id, variantId: variant.id, name: product.name, price: product.price, size: selectedSize, quantity: 1, slug: product.slug });
    addToast('✓', `${product.name} added to cart`);
    openCart();
    closeProductOverlay();
  };

  const goImg = (dir: 1 | -1) => setActiveImg(p => (p + dir + slides.length) % slides.length);

  return (
    <AnimatePresence>
      {activeProductOverlay && (
        <motion.div
          className="pv-root"
          role="dialog"
          aria-modal="true"
          aria-label="Product details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* ════════════════════════════════
              FULL-SCREEN IMAGE AREA
          ════════════════════════════════ */}
          <div
            ref={imgAreaRef}
            className="pv-img-area"
            style={{
              cursor: zoom > 1
                ? (isDragging.current ? 'grabbing' : 'grab')
                : (isDragging.current ? 'grabbing' : 'grab'),
              overflow: 'hidden',
            }}
            /* ── Touch — handled by native listeners in useEffect (passive:false) ── */
            /* ── Mouse ── */
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={e => { if (isDragging.current) onMouseUp(e); }}
            onDoubleClick={onDoubleClick}
            onWheel={onWheel}
          >
            {/* Image / placeholder — transformed by zoom + pan + swipe drag */}
            {currentSlide.src ? (
              // Raw img intentionally used here: zoom/pan transforms require full style control
              // that conflicts with next/image's layout wrappers. Image is already optimised
              // by next/image when served from Supabase Storage via remotePatterns.
              <img // eslint-disable-line @next/next/no-img-element
                key={currentSlide.src + clampedImg}
                src={currentSlide.src}
                alt={currentSlide.alt ?? `${product.name} — ${currentSlide.label}`}
                className="pv-real-img"
                draggable={false}
                style={{
                  transform: zoom > 1
                    ? `translate(${panX}px, ${panY}px) scale(${zoom})`
                    : `translateX(${dragOffsetX}px)`,
                  transition: isDragging.current ? 'none' : 'transform 0.25s ease',
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <div
                className="pv-img-placeholder"
                style={{
                  transform: zoom > 1
                    ? `translate(${panX}px, ${panY}px) scale(${zoom})`
                    : `translateX(${dragOffsetX}px)`,
                  transition: isDragging.current ? 'none' : 'transform 0.25s ease',
                  transformOrigin: 'center center',
                }}
              >
                <div className="pv-img-grid" />
                <span className="pv-img-initials">
                  {product.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                </span>
                <div className="pv-img-label-badge">{currentSlide.label}</div>
              </div>
            )}

            {/* Dark bottom fade */}
            <div className="pv-img-fade" />

            {/* ── Zoom level badge ── */}
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.65)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '5px 12px',
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.85)',
              zIndex: 10, pointerEvents: 'none',
              opacity: showZoomBadge ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}>
              {zoom <= 1 ? 'Double-tap to zoom' : `${Math.round(zoom * 100)}%`}
            </div>

            {/* ── Zoom controls (bottom-left) ── */}
            <div style={{
              position: 'absolute', bottom: 56, left: 16, zIndex: 10,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {/* Zoom in */}
              <button
                onClick={e => { e.stopPropagation(); applyZoom(zoom + 0.5); }}
                aria-label="Zoom in"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', fontSize: 18, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              {/* Zoom out / reset */}
              <button
                onClick={e => { e.stopPropagation(); zoom <= 1 ? applyZoom(zoom + 0.5) : applyZoom(Math.max(MIN_ZOOM, zoom - 0.5)); }}
                aria-label="Zoom out"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: zoom > 1 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)',
                  WebkitBackdropFilter: 'blur(8px)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${zoom > 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'}`,
                  color: '#fff', fontSize: 18, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = zoom > 1 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)')}
              >
                {zoom > 1 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                )}
              </button>
              {/* Reset — only visible when zoomed */}
              {zoom > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); resetZoom(); }}
                  aria-label="Reset zoom"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'var(--font-body)',
                    fontWeight: 700, letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.2s',
                    WebkitTapHighlightColor: 'transparent',
                  } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
                >
                  1×
                </button>
              )}
            </div>

            {/* ── TOP BAR ── */}
            <div className="pv-top-bar">
              <button className="pv-back-btn" onClick={closeProductOverlay} aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="pv-top-actions">
                <button className="pv-icon-btn" onClick={() => { toggleWithSync(product.id); addToast(isWishlisted ? '♡' : '♥', isWishlisted ? 'Removed' : 'Wishlisted'); }} aria-label="Wishlist">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? '#fff' : 'none'} stroke="currentColor" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                <button className="pv-icon-btn" onClick={() => { if (navigator.share) navigator.share({ title: product.name, url: window.location.href }); }} aria-label="Share">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Dot indicators — hidden while zoomed */}
            {zoom <= 1 && (
              <div className="pv-img-dots">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    className={`pv-img-dot${i === clampedImg ? ' active' : ''}${slide.src ? '' : ' pv-img-dot--placeholder'}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={slide.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ════════════════════════════════
              PRODUCT INFO SHEET
          ════════════════════════════════ */}
          <div className="pv-sheet">

            {/* Name + Price row */}
            <div className="pv-name-row">
              <div className="pv-name">{product.name}</div>
              <div className="pv-prices">
                <span className="pv-price">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <del className="pv-orig">{formatPrice(product.original_price)}</del>
                )}
              </div>
            </div>

            {/* Rating */}
            {avgRating && (
              <div className="pv-rating-row">
                <Stars rating={parseFloat(avgRating)} />
                <span className="pv-rating-num">{avgRating}</span>
                <span className="pv-rating-count">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Tagline */}
            {product.tagline && (
              <p className="pv-tagline">{product.tagline}</p>
            )}

            {/* Size selector */}
            <div className="pv-size-section">
              <div className="pv-size-header">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="pv-size-label">Select Size</span>
                  <SizeRecommendation category={product.category_id} />
                </div>
                <SizeGuide gender={product.category?.name?.includes("Women") ? "women" : "men"} />
              </div>
              <div className="pv-sizes">
                {product.variants?.map(v => {
                  const qty = getInventoryForVariant(product, v.id);
                  const oos = qty <= 0;
                  return (
                    <button
                      key={v.id}
                      className={`pv-size-btn${selectedSize === v.size ? ' active' : ''}${oos ? ' oos' : ''}`}
                      onClick={() => !oos && setSelectedSize(v.size)}
                      disabled={oos}
                    >
                      {v.size}
                      {qty > 0 && qty <= 3 && <span className="pv-size-low" />}
                    </button>
                  );
                })}\n              </div>

              {/* Notify me — shown when a size is selected and OOS */}
              {(() => {
                const selVariant = product.variants?.find(v => v.size === selectedSize);
                const selQty = selVariant ? getInventoryForVariant(product, selVariant.id) : -1;
                if (selectedSize && selQty === 0) {
                  return <NotifyMe productId={product.id} variantId={selVariant?.id ?? ''} productName={product.name} size={selectedSize} />;
                }
                return null;
              })()}

              {/* Also show if ALL sizes are OOS */}
              {(() => {
                const allOos = product.variants?.every(v => getInventoryForVariant(product, v.id) <= 0);
                if (allOos && !selectedSize) {
                  return (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.18)', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      This product is currently sold out. Select any size below to get notified when it&apos;s back.
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Delivery note */}
            <div className="pv-delivery-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Free shipping pan India · Usually ships in 4–8 days
            </div>

            {/* Product details toggle */}
            <button className="pv-details-toggle" onClick={() => setShowDetails(!showDetails)}>
              <span>Product Details</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
              </svg>
            </button>
            {showDetails && (
              <div className="pv-details-body">
                <p>{product.description || 'Premium quality oversized fit. Made with 240–260 GSM cotton. Drop shoulder silhouette. Pre-shrunk fabric.'}</p>
                <ul>
                  <li>240–260 GSM Premium Cotton</li>
                  <li>Oversized drop-shoulder fit</li>
                  <li>Pre-shrunk — wash before wearing</li>
                  <li>Made in India</li>
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div className="pv-reviews-section">
              {/* ── Header — click anywhere to collapse/expand ── */}
              <button
                className="pv-reviews-header"
                onClick={() => setShowReviewForm(false) as unknown || setReviewsOpen(p => !p)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
                aria-expanded={reviewsOpen}
              >
                <span className="pv-reviews-title">
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {reviewsOpen && (
                    <span
                      className="pv-write-review-btn"
                      role="button"
                      onClick={e => { e.stopPropagation(); setShowReviewForm(p => !p); }}
                      style={{ cursor: 'pointer' }}
                    >
                      {showReviewForm ? 'Cancel' : '+ Write a review'}
                    </span>
                  )}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.35)" strokeWidth="2"
                    style={{ transform: reviewsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>

              {/* ── Collapsible body ── */}
              {reviewsOpen && (
                <>
                  {/* Rating summary */}
                  {avgRating && (
                    <div className="pv-rating-summary">
                      <div className="pv-rating-big">{avgRating}</div>
                      <div className="pv-rating-summary-right">
                        <Stars rating={parseFloat(avgRating)} size={14} />
                        <div className="pv-rating-summary-count">{reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  )}

                  {/* No reviews yet */}
                  {reviews.length === 0 && !showReviewForm && (
                    <div className="pv-no-reviews">
                      <span>No reviews yet.</span>
                      <span> Be the first to share your experience.</span>
                    </div>
                  )}

                  {/* Review cards */}
                  {reviews.map((r) => (
                    <div key={r.id ?? r.name} className="pv-review-item">
                      <div className="pv-review-top">
                        <div className="pv-review-meta">
                          <Stars rating={r.rating} size={11} />
                          <span className="pv-review-date">{r.date}</span>
                        </div>
                        <div className="pv-review-author-row">
                          <span className="pv-review-author">{r.name}</span>
                          {r.tag && <span className="pv-review-verified">{r.tag}</span>}
                        </div>
                      </div>
                      <p className="pv-review-text">{r.text}</p>
                    </div>
                  ))}

                  {/* Write review form */}
                  {showReviewForm && (
                    <div className="pv-review-form">
                      <div className="pv-star-pick">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setReviewStar(s)} style={{ fontSize: 22, color: s <= reviewStar ? '#fff' : 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }}>★</button>
                        ))}
                      </div>
                      <input className="pv-review-input" placeholder="Your name" value={reviewName} onChange={e => setReviewName(e.target.value)} />
                      <textarea className="pv-review-input pv-review-textarea" placeholder="Share your experience..." value={reviewText} onChange={e => setReviewText(e.target.value)} />
                      <button className="pv-review-submit" onClick={async () => {
                        if (reviewStar === 0) { addToast('⚠', 'Please select a star rating'); return; }
                        if (!reviewName.trim()) { addToast('⚠', 'Please enter your name'); return; }
                        if (reviewText.trim().length < 10) { addToast('⚠', 'Review must be at least 10 characters'); return; }
                        // Optimistic local update
                        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        setLocalReviews(prev => [{
                          id: `local-${Date.now()}`,
                          name: reviewName.trim(),
                          rating: reviewStar,
                          text: reviewText.trim(),
                          date: dateStr,
                          tag: 'Pending Approval',
                        }, ...prev]);
                        // Submit to Supabase (approved by admin before showing publicly)
                        import('@/lib/db').then(({ submitReview }) => {
                          submitReview({
                            product_id: product.id,
                            reviewer_name: reviewName.trim(),
                            rating: reviewStar,
                            body: reviewText.trim(),
                          });
                        });
                        addToast('✓', 'Review submitted! It will appear after approval.');
                        setShowReviewForm(false);
                        setReviewName('');
                        setReviewText('');
                        setReviewStar(0);
                      }}>
                        Submit Review
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── RELATED PRODUCTS ── */}
            <RelatedProducts product={product} onOpen={(p) => { openProductOverlay(p); }} />

            {/* Bottom spacer for sticky CTA */}
            <div style={{ height: 80 }} />
          </div>

          {/* ════════════════════════════════
              STICKY ADD TO CART
          ════════════════════════════════ */}
          <div className="pv-sticky-cta">
            <button className="pv-add-btn" onClick={handleAddToCart}>
              {selectedSize ? `Add to Cart — ${selectedSize}` : 'Add to Cart'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
