'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const t = setTimeout(() => removeToast(latest.id), 3000);
    return () => clearTimeout(t);
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(10,10,10,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            padding: '10px 16px',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.08em',
            color: 'var(--white)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'toastIn 0.22s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 14 }}>{toast.icon}</span>
          <span>{toast.message}</span>
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
