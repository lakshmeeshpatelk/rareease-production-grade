/**
 * src/middleware.ts
 * Next.js Edge Middleware
 *
 * Runs on every request before it reaches a route handler or page.
 *
 * Responsibilities:
 *  1. Generate a unique x-request-id for distributed tracing
 *  2. Generate a CSP nonce for inline scripts
 *  3. Set all security headers (CSP, HSTS, X-Frame-Options, etc.)
 *  4. Refresh Supabase auth session cookie if expiring
 *
 * Razorpay domains are allowlisted in CSP so the SDK and payment
 * modal load without being blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // ── 1. Per-request identifiers ──────────────────────────────────
  const requestId = crypto.randomUUID();
  const nonce     = Buffer.from(crypto.randomUUID()).toString('base64');

  const isProd = process.env.NEXT_PUBLIC_APP_ENV === 'production';

  // ── 2. Content Security Policy ───────────────────────────────────
  // Razorpay requires:
  //   script-src  → checkout.razorpay.com  (loads the JS SDK)
  //   connect-src → api.razorpay.com       (API calls from SDK)
  //   frame-src   → api.razorpay.com       (payment modal iframe)
  const cspDirectives = [
    `default-src 'self'`,

    // Scripts: self + nonce for inline + Razorpay SDK
    `script-src 'self' 'nonce-${nonce}' https://checkout.razorpay.com${isProd ? '' : " 'unsafe-eval'"}`,

    // Styles: unsafe-inline needed for styled-jsx / Tailwind runtime
    `style-src 'self' 'unsafe-inline'`,

    // Fonts
    `font-src 'self'`,

    // API connections
    [
      `connect-src`,
      `'self'`,
      `https://*.supabase.co`,
      `https://*.supabase.in`,
      `https://api.razorpay.com`,
      `https://apiv2.shiprocket.in`,
      `https://*.sentry.io`,
      `https://o*.ingest.sentry.io`,
      // Upstash Redis
      process.env.UPSTASH_REDIS_REST_URL ?? '',
    ].filter(Boolean).join(' '),

    // Images
    `img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com`,

    // Razorpay payment modal iframe
    `frame-src https://api.razorpay.com`,

    // Media
    `media-src 'self' https://*.supabase.co https://*.supabase.in`,

    // Workers
    `worker-src 'self' blob:`,

    // Manifest
    `manifest-src 'self'`,

    // No plugins
    `object-src 'none'`,

    // Base URI
    `base-uri 'self'`,

    // Form submissions
    `form-action 'self'`,

    // HTTPS upgrade in production
    isProd ? `upgrade-insecure-requests` : '',
  ].filter(Boolean).join('; ');

  // ── 3. Build response with auth session refresh ──────────────────
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Refresh Supabase session so it doesn't expire mid-browse
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options } as any);
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options } as any);
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    });

    // Silently refresh — don't block the request on failure
    await supabase.auth.getUser().catch(() => null);
  }

  // ── 4. Apply security headers ────────────────────────────────────
  res.headers.set('Content-Security-Policy',   cspDirectives);
  res.headers.set('X-Content-Type-Options',    'nosniff');
  res.headers.set('X-Frame-Options',           'DENY');
  res.headers.set('X-DNS-Prefetch-Control',    'on');
  res.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()');

  // HSTS — only in production
  if (isProd) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Tracing headers (available to route handlers via request headers)
  res.headers.set('x-request-id', requestId);
  res.headers.set('x-nonce',      nonce);

  // Remove fingerprinting header
  res.headers.delete('X-Powered-By');

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public folder files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};