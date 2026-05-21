/**
 * useFocusTrap.ts
 * Traps keyboard focus inside a container while it is active.
 * Restores focus to the previously focused element on deactivation.
 *
 * Usage:
 *   const ref = useFocusTrap(isOpen);
 *   <div ref={ref} role="dialog" aria-modal="true"> ... </div>
 */
'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save what was focused before opening
    previousFocus.current = document.activeElement;

    // Focus first focusable child
    const container = containerRef.current;
    if (container) {
      const first = container.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);

      if (focusable.length === 0) { e.preventDefault(); return; }

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on close
      (previousFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [active]);

  return containerRef;
}
