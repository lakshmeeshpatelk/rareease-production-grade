import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rare Ease — Wear The Rare. Feel The Ease.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Subtle grain texture via radial gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, #1a1a1a 0%, #000 100%)',
          }}
        />

        {/* Left accent line */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'linear-gradient(to bottom, transparent, #ffffff22, transparent)',
          }}
        />

        {/* Right accent line */}
        <div
          style={{
            position: 'absolute',
            right: 80,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'linear-gradient(to bottom, transparent, #ffffff22, transparent)',
          }}
        />

        {/* Top label */}
        <div
          style={{
            position: 'absolute',
            top: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ width: 40, height: 1, background: '#ffffff44' }} />
          <span
            style={{
              color: '#ffffff88',
              fontSize: 11,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
            }}
          >
            INDIAN STREETWEAR
          </span>
          <div style={{ width: 40, height: 1, background: '#ffffff44' }} />
        </div>

        {/* Main brand name */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            zIndex: 1,
          }}
        >
          <span
            style={{
              color: '#F5F5F5',
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            RARE
          </span>
          <span
            style={{
              color: '#F5F5F5',
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            EASE
          </span>
        </div>

        {/* Horizontal rule */}
        <div
          style={{
            width: 200,
            height: 1,
            background: '#ffffff44',
            margin: '32px 0 28px',
            zIndex: 1,
          }}
        />

        {/* Tagline */}
        <span
          style={{
            color: '#C8C8C8',
            fontSize: 22,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            zIndex: 1,
          }}
        >
          Wear The Rare. Feel The Ease.
        </span>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            color: '#ffffff55',
            fontSize: 13,
            letterSpacing: '0.15em',
          }}
        >
          rareease.com
        </div>
      </div>
    ),
    { ...size }
  );
}
