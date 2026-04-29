'use client';

import { useEffect, useRef, useState } from 'react';

export default function BrandVideoSection() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef   = useRef<number>();

  // Fetch video URL from public API
  useEffect(() => {
    fetch('/api/brand-video')
      .then(r => r.json())
      .then(d => setVideoUrl(d.url ?? null))
      .catch(() => {});
  }, []);

  // Animate progress bar in sync with video
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration > 0) {
        setProgress((v.currentTime / v.duration) * 100);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loaded]);

  // Don't render if no video uploaded
  if (!videoUrl) return null;

  return (
    <section className="bvs-wrap">
      <div className="bvs-inner">

        {/* Label */}
        <div className="bvs-label-row">
          <span className="bvs-pill">▶ BRAND FILM</span>
        </div>

        {/* Video container */}
        <div className="bvs-video-outer">
          {/* Decorative corner marks */}
          <span className="bvs-corner bvs-corner--tl" />
          <span className="bvs-corner bvs-corner--tr" />
          <span className="bvs-corner bvs-corner--bl" />
          <span className="bvs-corner bvs-corner--br" />

          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="bvs-video"
            onCanPlay={() => setLoaded(true)}
          />

          {/* Loading shimmer until video is ready */}
          {!loaded && (
            <div className="bvs-shimmer" />
          )}

          {/* Subtle gradient overlay — keeps branding text legible */}
          <div className="bvs-gradient-overlay" />

          {/* Bottom meta bar */}
          <div className="bvs-meta">
            <span className="bvs-meta-brand">RARE EASE</span>
            <span className="bvs-meta-tag">15s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bvs-progress-track">
          <div className="bvs-progress-fill" style={{ width: `${progress}%` }} />
        </div>

      </div>

      <style>{`
        /* ── Wrapper ─────────────────────────────────── */
        .bvs-wrap {
          width: 100%;
          background: #0a0a0a;
          padding: 48px 0 40px;
          overflow: hidden;
        }
        .bvs-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* ── Label row ───────────────────────────────── */
        .bvs-label-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .bvs-pill {
          display: inline-block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          color: #c3ce94;
          border: 1px solid rgba(195,206,148,0.35);
          padding: 4px 12px;
          background: rgba(195,206,148,0.06);
        }

        /* ── Video container ─────────────────────────── */
        .bvs-video-outer {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #111;
          overflow: hidden;
        }

        /* Corner brackets */
        .bvs-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          z-index: 3;
          pointer-events: none;
        }
        .bvs-corner--tl { top: 8px;  left: 8px;
          border-top: 1.5px solid rgba(195,206,148,0.55);
          border-left: 1.5px solid rgba(195,206,148,0.55); }
        .bvs-corner--tr { top: 8px;  right: 8px;
          border-top: 1.5px solid rgba(195,206,148,0.55);
          border-right: 1.5px solid rgba(195,206,148,0.55); }
        .bvs-corner--bl { bottom: 8px; left: 8px;
          border-bottom: 1.5px solid rgba(195,206,148,0.55);
          border-left: 1.5px solid rgba(195,206,148,0.55); }
        .bvs-corner--br { bottom: 8px; right: 8px;
          border-bottom: 1.5px solid rgba(195,206,148,0.55);
          border-right: 1.5px solid rgba(195,206,148,0.55); }

        .bvs-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .bvs-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(255,255,255,0.02) 25%,
            rgba(255,255,255,0.06) 50%,
            rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
          animation: bvs-shimmer 1.6s infinite linear;
          z-index: 2;
        }
        @keyframes bvs-shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }

        .bvs-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0,0,0,0.55) 0%,
            transparent 50%
          );
          pointer-events: none;
          z-index: 1;
        }

        /* ── Meta bar (inside video) ─────────────────── */
        .bvs-meta {
          position: absolute;
          bottom: 14px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
        }
        .bvs-meta-brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 0.22em;
          color: rgba(255,255,255,0.75);
        }
        .bvs-meta-tag {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(195,206,148,0.6);
          border: 1px solid rgba(195,206,148,0.25);
          padding: 2px 7px;
        }

        /* ── Progress bar ────────────────────────────── */
        .bvs-progress-track {
          width: 100%;
          height: 2px;
          background: rgba(255,255,255,0.07);
          margin-top: 10px;
          overflow: hidden;
        }
        .bvs-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c3ce94, rgba(195,206,148,0.4));
          transition: width 0.1s linear;
        }

        /* ── Mobile tweaks ───────────────────────────── */
        @media (max-width: 600px) {
          .bvs-wrap { padding: 32px 0 28px; }
          .bvs-meta-brand { font-size: 12px; }
        }
      `}</style>
    </section>
  );
}