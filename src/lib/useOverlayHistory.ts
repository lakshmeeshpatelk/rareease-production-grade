'use client';

import { useEffect, useRef } from 'react';

// Module-level flag: when an overlay closes, it signals that the NEXT overlay
// to open in the same microtask batch should replace rather than push, preventing
// a leftover history entry in close+open swap scenarios (e.g. Search → Product).
let _useReplaceForNext = false;

export function useOverlayHistory(isOpen: boolean, onClose: () => void) {
  const sentinelKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isOpen) return;

    const key = `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sentinelKey.current = key;

    if (_useReplaceForNext) {
      // Reuse the current history slot (no extra entry)
      history.replaceState({ overlayKey: key }, '');
      _useReplaceForNext = false;
    } else {
      history.pushState({ overlayKey: key }, '');
    }

    const handlePop = () => {
      if (sentinelKey.current === null) return;
      sentinelKey.current = null;
      onClose();
    };

    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);

      if (sentinelKey.current !== null) {
        sentinelKey.current = null;
        // Signal: if another overlay opens in this same microtask, let it reuse this slot
        _useReplaceForNext = true;
        queueMicrotask(() => {
          // If nothing opened in this microtask, clear the flag and neutralize the entry
          if (_useReplaceForNext) {
            _useReplaceForNext = false;
            try {
              history.replaceState({ overlayKey: null, consumed: true }, '');
            } catch (_) {}
          }
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}