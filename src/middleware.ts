/**
 * middleware.ts — Edge middleware that runs on every non-static request.
 *
 * Responsibilities:
 *   1. Generate a per-request nonce for Content-Security-Policy
 *   2. Attach a unique x-request-id for distributed tracing
 *   3. Apply all security response headers (replaces static headers in next.config.js)
 *   4. Warn when rate-limit Redis is unconfigured in production
 *
 * Everything here runs in the Edge Runtime (no Node.js APIs).
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Nonce generation (Edge-compatible: no Buffer, uses Web Crypto) ──────────
function generateNonce(): string {
  // 128 bits of entropy, base64-encoded → ~22 chars, always URL-safe as a CSP nonce
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa expects a binary string
  return btoa(String.fromCharCode(...bytes));
}

// ── Build the Content-Security-Policy header value ──────────────────────────
function buildCSP(nonce: string, isProd: boolean): string {
  const scriptSrc = isProd
    // Production: no unsafe-eval; nonce required for all inline scripts
    // 'unsafe-inline' is kept as a CSP Level 2 fallback ONLY — in CSP Level 3
    // browsers that support nonces, unsafe-inline is automatically ignored when
    // a nonce is present, so the nonce is the effective control.
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-inline'",     // CSP2 fallback (ignored by CSP3 browsers when nonce is present)
        'https://sdk.cashfree.com',
        'https://browser.sentry-cdn.com',
        'https://js.sentry-cdn.com',
      ].join(' ')
    // Development: add unsafe-eval for Next.js hot-module reload
    : [
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://sdk.cashfree.com',
        'https://browser.sentry-cdn.com',
        'https://js.sentry-cdn.com',
      ].join(' ');

  const cashfreeSandbox = isProd ? '' : ' https://sandbox.cashfree.com https://*.cashfree.com';

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com",
    `connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.cashfree.com https://*.cashfree.com${cashfreeSandbox} https://*.sentry.io https://*.upstash.io https://api.resend.com`,
    `frame-src https://api.cashfree.com https://sdk.cashfree.com https://*.cashfree.com${cashfreeSandbox}`,
    "font-src 'self' https://fonts.gstatic.com",
    // style-src: unsafe-inline is required for Tailwind CSS-in-JS utilities and Next.js
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "worker-src blob: 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// ── Warn once on first request if Redis is absent in production ──────────────
let _redisWarningLogged = false;
function warnIfRedisMissing(isProd: boolean) {
  if (!isProd || _redisWarningLogged) return;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redisWarningLogged = true;
    console.warn(
      '[middleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
      'Rate limiting is falling back to per-instance in-memory store — this does NOT ' +
      'persist across Vercel serverless instances. Set Upstash credentials in production.'
    );
  }
}

// ── Middleware ───────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const isProd = process.env.CASHFREE_ENV === 'production';

  warnIfRedisMissing(isProd);

  const nonce     = generateNonce();
  const requestId = crypto.randomUUID();
  const csp       = buildCSP(nonce, isProd);

  // Forward nonce + requestId to server components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce',      nonce);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── Security response headers ──────────────────────────────────────────────
  response.headers.set('Content-Security-Policy',   csp);
  response.headers.set('X-Content-Type-Options',    'nosniff');
  response.headers.set('X-Frame-Options',           'SAMEORIGIN');
  response.headers.set('X-XSS-Protection',          '1; mode=block');
  response.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Expose request ID for client-side error reporting and server logs
  response.headers.set('X-Request-ID', requestId);

  // Remove the default "X-Powered-By: Next.js" header (information disclosure)
  response.headers.delete('X-Powered-By');

  return response;
}

// Skip middleware for Next.js internals and static assets
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};