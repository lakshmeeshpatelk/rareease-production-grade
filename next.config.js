/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── App Router body size limit (for product image uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

  // ── Gzip/Brotli compression ──────────────────────────────────────────────
  compress: true,

  // ── Image optimisation ───────────────────────────────────────────────────
  images: {
    // AVIF first (50% smaller than WebP), WebP fallback
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images for 7 days on Vercel's CDN
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384, 512],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    dangerouslyAllowSVG: false,
  },

  // ── Cache headers (security headers are handled in src/middleware.ts) ─────
  // Security headers (CSP, HSTS, X-Frame-Options, etc.) are applied per-request
  // in middleware so they can carry a dynamic nonce and a unique x-request-id.
  // Only static asset cache policies live here.
  async headers() {
    return [
      // Immutable assets — 1 year cache
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Semi-static assets — 24h cache with background revalidation
      {
        source: '/hero/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        source: '/products/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      // OG image — cache 24h
      {
        source: '/opengraph-image',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
    ];
  },
};

// Wrap with Sentry only when NEXT_PUBLIC_SENTRY_DSN is set (optional in dev)
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

if (hasSentry) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs');
    module.exports = withSentryConfig(nextConfig, {
      org:       process.env.SENTRY_ORG,
      project:   process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      hideSourceMaps: true,
      widenClientFileUpload: true,
      automaticVercelMonitors: true,
    });
  } catch {
    // @sentry/nextjs not yet installed — skip wrapping
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}