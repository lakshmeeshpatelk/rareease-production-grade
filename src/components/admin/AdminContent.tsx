'use client';
import { useState, useRef, useEffect } from 'react';
import { DEFAULT_HERO_SLIDES, DEFAULT_ANNOUNCEMENTS, HeroSlide, AnnouncementMsg } from '@/lib/adminData';
import { useAdminStore } from '@/store/adminStore';

export default function AdminContent() {
  const { heroSlides, announcements, loadContent, saveContent, loading } = useAdminStore();
  const [slides,  setSlides]  = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [annMsgs, setAnnMsgs] = useState<AnnouncementMsg[]>(DEFAULT_ANNOUNCEMENTS);
  const [saved,   setSaved]   = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const heroFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [heroUploading, setHeroUploading] = useState<Record<number, boolean>>({});

  // ── Brand Video state ────────────────────────────────────────────
  const [brandVideoUrl,      setBrandVideoUrl]      = useState<string | null>(null);
  const [brandVideoLoading,  setBrandVideoLoading]  = useState(false);
  const [brandVideoDeleting, setBrandVideoDeleting] = useState(false);
  const [brandVideoSaved,    setBrandVideoSaved]    = useState(false);
  const brandVideoRef = useRef<HTMLInputElement | null>(null);

  const handleHeroUpload = async (slideId: number, file: File) => {
    setHeroUploading(p => ({ ...p, [slideId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slideId', String(slideId));
      const res = await fetch('/api/admin/hero-image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Upload failed');
      const { url } = await res.json();
      setSlides(p => p.map(s => s.id === slideId ? { ...s, src: url } : s));
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setHeroUploading(p => ({ ...p, [slideId]: false }));
    }
  };

  // ── Brand Video handlers ─────────────────────────────────────────
  const loadBrandVideo = async () => {
    try {
      const res = await fetch('/api/admin/brand-video');
      if (res.ok) {
        const { url } = await res.json();
        setBrandVideoUrl(url ?? null);
      }
    } catch {}
  };

  const handleBrandVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file (MP4, MOV, WebM).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be under 50 MB.');
      return;
    }
    setBrandVideoLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/brand-video', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Upload failed');
      const { url } = await res.json();
      setBrandVideoUrl(url);
      setBrandVideoSaved(true);
      setTimeout(() => setBrandVideoSaved(false), 2500);
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBrandVideoLoading(false);
    }
  };

  const handleBrandVideoDelete = async () => {
    if (!confirm('Remove the brand promo video from the homepage?')) return;
    setBrandVideoDeleting(true);
    try {
      await fetch('/api/admin/brand-video', { method: 'DELETE' });
      setBrandVideoUrl(null);
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBrandVideoDeleting(false);
    }
  };

  useEffect(() => {
    loadContent();
    loadBrandVideo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state when store loads from Supabase
  useEffect(() => {
    if (heroSlides.length > 0) setSlides(heroSlides);
  }, [heroSlides]);
  useEffect(() => {
    if (announcements.length > 0) setAnnMsgs(announcements);
  }, [announcements]);

  // ── Slide helpers ────────────────────────────────────────────────
  const toggleSlide   = (id: number) => setSlides(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const updateField   = (id: number, key: keyof HeroSlide, val: string) =>
    setSlides(p => p.map(s => s.id === id ? { ...s, [key]: val } : s));
  const moveSlide     = (id: number, dir: -1 | 1) => {
    setSlides(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(s => s.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
  };

  // ── Announcement helpers ─────────────────────────────────────────
  const toggleAnn    = (id: number) => setAnnMsgs(p => p.map(m => m.id === id ? { ...m, active: !m.active } : m));
  const updateAnnTxt = (id: number, text: string) => setAnnMsgs(p => p.map(m => m.id === id ? { ...m, text } : m));
  const deleteAnn    = (id: number) => setAnnMsgs(p => p.filter(m => m.id !== id));

  const saveAll = async () => {
    await saveContent(slides, annMsgs);
    setSaved(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button className="adm-header-btn adm-header-btn--primary" onClick={saveAll} disabled={loading.content}>
          {loading.content ? 'Saving…' : saved ? '✓ Saved' : 'Save All Changes'}
        </button>
      </div>

      {/* ── Brand Promo Video ────────────────────────────────────────── */}
      <div className="adm-content-section" style={{ marginBottom: 28 }}>
        <div className="adm-content-section-title">Brand Promo Video</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:16, letterSpacing:'0.05em', lineHeight:1.7 }}>
          Upload a short brand film (≤ 15 seconds, ≤ 50 MB — MP4 recommended).
          It appears as a full-width section above &quot;Trending Now&quot; on the homepage.
          If no video is uploaded, the section is hidden automatically.
        </div>

        {/* Preview */}
        {brandVideoUrl ? (
          <div style={{ marginBottom: 16, position: 'relative', background: '#111', border: '1px solid rgba(195,206,148,0.15)', overflow: 'hidden', aspectRatio: '16/9', maxWidth: 480 }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={brandVideoUrl}
              muted
              autoPlay
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Live badge */}
            <div style={{ position:'absolute', top:8, left:10, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#c3ce94', display:'inline-block', animation:'bvs-pulse 1.4s ease infinite' }} />
              <span style={{ fontSize:9, letterSpacing:'0.15em', color:'rgba(195,206,148,0.8)', fontFamily:'Bebas Neue,sans-serif' }}>LIVE ON HOMEPAGE</span>
            </div>
          </div>
        ) : (
          <div style={{
            width: '100%', maxWidth: 480, aspectRatio: '16/9',
            background: 'rgba(255,255,255,0.025)',
            border: '1.5px dashed rgba(195,206,148,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 32, opacity: 0.2 }}>▶</span>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>No video uploaded</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Hidden file input */}
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            ref={el => { brandVideoRef.current = el; }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleBrandVideoUpload(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => brandVideoRef.current?.click()}
            disabled={brandVideoLoading}
            style={{
              background: 'rgba(195,206,148,0.08)',
              border: '1px solid rgba(195,206,148,0.3)',
              color: brandVideoLoading ? 'rgba(255,255,255,0.3)' : 'rgba(195,206,148,0.8)',
              cursor: brandVideoLoading ? 'not-allowed' : 'pointer',
              padding: '7px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            {brandVideoLoading ? '⏳ Uploading…' : brandVideoSaved ? '✓ Uploaded!' : brandVideoUrl ? '🎬 Replace Video' : '🎬 Upload Video'}
          </button>

          {brandVideoUrl && (
            <button
              onClick={handleBrandVideoDelete}
              disabled={brandVideoDeleting}
              style={{
                background: 'rgba(255,107,107,0.07)',
                border: '1px solid rgba(255,107,107,0.2)',
                color: 'rgba(255,107,107,0.6)',
                cursor: brandVideoDeleting ? 'not-allowed' : 'pointer',
                padding: '7px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              {brandVideoDeleting ? 'Removing…' : '× Remove Video'}
            </button>
          )}
        </div>

        <style>{`
          @keyframes bvs-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>

      {/* ── Hero Slides ─────────────────────────────────────────────── */}
      <div className="adm-content-section">
        <div className="adm-content-section-title">Hero Carousel Slides</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:14, letterSpacing:'0.05em' }}>
          Upload images, reorder slides, edit headline/subtitle/CTA per slide. Toggle to show/hide.
        </div>
        <div className="adm-hero-slides">
          {slides.map((s, idx) => (
            <div key={s.id} className={`adm-hero-slide${s.active ? ' active' : ''}`}>

              {/* Image or placeholder */}
              {s.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.src} alt={s.label} className={`adm-hero-slide-img${!s.active ? ' inactive' : ''}`} />
              ) : (
                <div className={`adm-hero-slide-img${!s.active ? ' inactive' : ''}`} style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, minHeight:80 }}>
                  <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:'0.15em', color:'rgba(255,255,255,0.12)' }}>SLIDE {idx + 1}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em', textTransform:'uppercase' }}>No image uploaded</span>
                </div>
              )}

              {/* Upload button */}
              <div style={{ padding:'6px 0 4px' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display:'none' }}
                  ref={el => { heroFileRefs.current[s.id] = el; }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleHeroUpload(s.id, file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => heroFileRefs.current[s.id]?.click()}
                  disabled={!!heroUploading[s.id]}
                  style={{ background:'rgba(195,206,148,0.08)', border:'1px solid rgba(195,206,148,0.2)', color: heroUploading[s.id] ? 'rgba(255,255,255,0.3)' : 'rgba(195,206,148,0.7)', cursor: heroUploading[s.id] ? 'not-allowed' : 'pointer', padding:'4px 10px', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', width:'100%' }}
                >
                  {heroUploading[s.id] ? '⏳ Uploading…' : '📷 Change Image'}
                </button>
              </div>

              <div className="adm-hero-slide-body">
                <input className="adm-ann-text" style={{ marginBottom:4, fontFamily:'Bebas Neue,sans-serif', fontSize:'max(16px,14px)', letterSpacing:'0.08em' }}
                  value={s.label} onChange={e => updateField(s.id, 'label', e.target.value)} placeholder="Slide headline" />
                <input className="adm-ann-text" style={{ marginBottom:4, fontSize:11 }}
                  value={s.sub} onChange={e => updateField(s.id, 'sub', e.target.value)} placeholder="Subtitle" />
                <input className="adm-ann-text" style={{ marginBottom:4, fontSize:11 }}
                  value={s.ctaText ?? 'Shop Now'} onChange={e => updateField(s.id, 'ctaText', e.target.value)} placeholder="CTA button text" />
                <input className="adm-ann-text" style={{ marginBottom:10, fontSize:'max(16px,11px)', color:'rgba(195,206,148,0.6)' }}
                  value={s.ctaLink ?? '#shop'} onChange={e => updateField(s.id, 'ctaLink', e.target.value)} placeholder="CTA link (e.g. #shop)" />

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => moveSlide(s.id, -1)} disabled={idx === 0}
                    style={{ background:'none', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:'3px 7px', fontSize:12, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                  <button onClick={() => moveSlide(s.id, 1)} disabled={idx === slides.length - 1}
                    style={{ background:'none', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:'3px 7px', fontSize:12, opacity: idx === slides.length - 1 ? 0.3 : 1 }}>↓</button>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', flex:1 }}>
                    #{idx+1} · {s.active ? 'Visible' : 'Hidden'}
                  </span>
                  <label className="adm-toggle">
                    <input type="checkbox" checked={s.active} onChange={() => toggleSlide(s.id)} />
                    <div className="adm-toggle-track" />
                    <div className="adm-toggle-thumb" />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Announcement Bar ─────────────────────────────────────────── */}
      <div className="adm-content-section">
        <div className="adm-content-section-title">Announcement Bar Messages</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:14, letterSpacing:'0.05em' }}>
          Messages rotate in the announcement bar. Toggle to show/hide, or delete to remove permanently.
        </div>
        {annMsgs.map(m => (
          <div key={m.id} className="adm-ann-item">
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:'0.15em', minWidth:20 }}>{m.id}</span>
            <input className="adm-ann-text" value={m.text} onChange={e => updateAnnTxt(m.id, e.target.value)} />
            <label className="adm-toggle" style={{ marginLeft:8 }}>
              <input type="checkbox" checked={m.active} onChange={() => toggleAnn(m.id)} />
              <div className="adm-toggle-track" />
              <div className="adm-toggle-thumb" />
            </label>
            <button onClick={() => deleteAnn(m.id)}
              style={{ background:'none', border:'none', color:'rgba(255,107,107,0.5)', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>×</button>
          </div>
        ))}
        <button className="adm-act-btn adm-act-btn--sage" style={{ marginTop:8 }}
          onClick={() => setAnnMsgs(p => [...p, { id: Date.now(), text:'✦ New announcement ✦', active:true }])}>
          + Add Message
        </button>
      </div>

      {/* ── Site Info / Social ───────────────────────────────────────── */}
      <div className="adm-content-section">
        <div className="adm-content-section-title">Contact &amp; Social Links</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[
            { label:'Email', placeholder:'rareeaseofficial@gmail.com', defaultValue:'rareeaseofficial@gmail.com' },
            { label:'WhatsApp Number', placeholder:'919XXXXXXXXX', defaultValue:'' },
            { label:'Instagram Handle', placeholder:'@rareeaseofficial', defaultValue:'@rareeaseofficial' },
            { label:'Site URL', placeholder:'https://rareease.com', defaultValue:'https://rareease.com' },
          ].map(f => (
            <div className="adm-field" key={f.label}>
              <label className="adm-field-label">{f.label}</label>
              <input className="adm-field-input" placeholder={f.placeholder} defaultValue={f.defaultValue} />
            </div>
          ))}
        </div>
        <div style={{ marginTop:8, padding:'12px 14px', background:'rgba(195,206,148,0.05)', border:'1px solid rgba(195,206,148,0.15)', fontSize:11, color:'rgba(255,255,255,0.35)', letterSpacing:'0.05em', lineHeight:1.6 }}>
          ✓ Hero slides and announcements are persisted in Supabase. Changes take effect immediately site-wide.
        </div>
      </div>
    </div>
  );
}