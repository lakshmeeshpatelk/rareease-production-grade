'use client';

import { useEffect, useRef } from 'react';

/**
 * Cursor — custom mouse cursor (desktop only)
 *
 * Performance fix: replaced per-element mouseenter/mouseleave listeners +
 * MutationObserver with a single event-delegation approach.
 *
 * Old approach:
 *   - Queried every <a> and <button> on mount and attached 2 listeners each
 *   - Ran MutationObserver({ subtree: true }) on document.body to catch
 *     dynamically added elements — fired after every React render
 *   - Result: hundreds of listeners + continuous DOM observation overhead
 *
 * New approach:
 *   - One mouseover + one mouseout listener on document
 *   - Uses Element.closest('a, button, [data-cursor]') to check target
 *   - Handles dynamically added elements automatically, zero extra overhead
 */
export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't run on touch-primary devices — no mouse to track
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX  = 0, ringY  = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top  = `${mouseY}px`;
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = `${ringX}px`;
      ring.style.top  = `${ringY}px`;
      raf = requestAnimationFrame(animate);
    };

    // ── Event delegation: one pair of listeners on document ───────────────
    // Much cheaper than attaching listeners to every button/link individually
    // and eliminates the need for MutationObserver entirely.
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('a, button, [data-cursor]')) {
        dot.classList.add('expanded');
        ring.classList.add('expanded');
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('a, button, [data-cursor]')) {
        dot.classList.remove('expanded');
        ring.classList.remove('expanded');
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout',  onOut);
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout',  onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
