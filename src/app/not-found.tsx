import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#F5F5F5',
        fontFamily: 'var(--font-body, sans-serif)',
        gap: '2rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.4em',
          color: '#555',
          textTransform: 'uppercase',
        }}
      >
        RARE EASE
      </span>

      <h1
        style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: 'clamp(80px, 20vw, 160px)',
          lineHeight: 1,
          margin: 0,
          color: '#111',
          letterSpacing: '0.05em',
        }}
        aria-label="404 — Page not found"
      >
        404
      </h1>

      <p
        style={{
          fontSize: 14,
          color: '#666',
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.7,
          letterSpacing: '0.02em',
        }}
      >
        This drop doesn&apos;t exist — or it sold out before you got here.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            padding: '11px 28px',
            background: '#F5F5F5',
            color: '#000',
            border: 'none',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Back to Home
        </Link>
        <Link
          href="/?shop=open"
          style={{
            padding: '11px 28px',
            background: 'transparent',
            color: '#555',
            border: '1px solid #222',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Shop All
        </Link>
      </div>
    </div>
  );
}