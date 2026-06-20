'use client';

import { useState, useEffect } from 'react';

const DEFAULT_MSGS = [
  '✦ Free shipping pan India on all orders ✦',
  '✦ SS25 Drop is live — limited stock ✦',
  '✦ New drops every Friday · @rareeaseofficial ✦',
];

export const ANN_STORAGE_KEY   = 'rareease-ann-messages';
export const ANN_DISMISSED_KEY = 'rareease-ann-dismissed';

async function fetchRemoteMessages(): Promise<string[]> {
  try {
    const { getClient } = await import('@/lib/supabase');
    const { data } = await getClient()
      .from('site_settings')
      .select('value')
      .eq('key', 'announcements')
      .single();
    if (!data?.value) return DEFAULT_MSGS;
    const parsed: { text: string; active: boolean }[] = JSON.parse(data.value);
    const active = parsed.filter(m => m.active).map(m => m.text);
    return active.length > 0 ? active : DEFAULT_MSGS;
  } catch {
    return DEFAULT_MSGS;
  }
}

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [idx,  setIdx]   = useState(0);
  const [msgs, setMsgs]  = useState<string[]>(DEFAULT_MSGS);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(ANN_DISMISSED_KEY);
    if (!wasDismissed) setDismissed(false);

    // Fetch from Supabase, fall back to localStorage cache
    fetchRemoteMessages().then(remote => {
      setMsgs(remote);
      try { localStorage.setItem(ANN_STORAGE_KEY, JSON.stringify(remote.map((text, i) => ({ id: i + 1, text, active: true })))); } catch {}
    });

    // Re-read if admin updates in another tab (legacy support)
    const onStorage = (e: StorageEvent) => {
      if (e.key === ANN_STORAGE_KEY && e.newValue) {
        try {
          const parsed: { text: string; active: boolean }[] = JSON.parse(e.newValue);
          const active = parsed.filter(m => m.active).map(m => m.text);
          if (active.length > 0) setMsgs(active);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 3500);
    return () => clearInterval(t);
  }, [msgs.length]);

  const handleDismiss = () => {
    sessionStorage.setItem(ANN_DISMISSED_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="ann-bar">
      <p className="ann-text">{msgs[idx]}</p>
      <button className="ann-close" onClick={handleDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
