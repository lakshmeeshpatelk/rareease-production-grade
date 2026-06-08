'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
          fontFamily: 'sans-serif',
          gap: '1.5rem',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, letterSpacing: '0.2em', color: '#888', textTransform: 'uppercase' }}>
            RARE EASE
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Critical error</h1>
          <p style={{ fontSize: 14, color: '#888', margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
            A critical error occurred. Please refresh the page or contact support.
          </p>
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
        </div>
      </body>
    </html>
  );
}