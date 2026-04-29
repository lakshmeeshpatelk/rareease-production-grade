'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'var(--font-body, sans-serif)',
      gap: '1.5rem',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, letterSpacing: '0.2em', color: '#888', textTransform: 'uppercase' }}>
        RARE EASE
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Something went wrong</h1>
      <p style={{ fontSize: 14, color: '#888', margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
        We hit an unexpected error. Your cart and order are safe — please try again or contact us if the issue persists.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#fff',
            color: '#000',
            border: 'none',
            fontSize: 13,
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          TRY AGAIN
        </button>
        <a
          href="/"
          style={{
            padding: '10px 24px',
            background: 'transparent',
            color: '#888',
            border: '1px solid #333',
            fontSize: 13,
            letterSpacing: '0.1em',
            textDecoration: 'none',
          }}
        >
          GO HOME
        </a>
      </div>
    </div>
  );
}