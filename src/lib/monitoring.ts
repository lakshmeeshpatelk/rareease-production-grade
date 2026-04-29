/**
 * monitoring.ts — Lightweight Sentry wrapper.
 *
 * REQUIRED ENV VARS:
 *   NEXT_PUBLIC_SENTRY_DSN  — your Sentry DSN (safe to expose in browser)
 *   SENTRY_AUTH_TOKEN       — for source-map uploads (build-time only)
 *   NEXT_PUBLIC_APP_ENV     — "production" | "staging" | "development"
 *
 * Install: npm install @sentry/nextjs
 * Then run: npx @sentry/wizard@latest -i nextjs
 *
 * Usage:
 *   import { captureException, setRequestContext } from '@/lib/monitoring';
 *   await setRequestContext(req);
 *   captureException(err, { orderId, userId });
 */

type Extras = Record<string, unknown>;

// Dynamic import so the bundle never fails if @sentry/nextjs isn't installed yet
let _Sentry: typeof import('@sentry/nextjs') | null = null;

async function getSentry() {
  if (_Sentry) return _Sentry;
  try {
    _Sentry = await import('@sentry/nextjs');
    return _Sentry;
  } catch {
    return null;
  }
}

export async function captureException(err: unknown, extras?: Extras) {
  const S = await getSentry();
  if (S && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (extras) S.setContext('extras', extras);
    S.captureException(err);
  } else {
    // Always log server-side so Vercel logs catch it
    console.error('[monitoring] captureException:', err, extras ?? '');
  }
}

export async function captureMessage(msg: string, extras?: Extras) {
  const S = await getSentry();
  if (S && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (extras) S.setContext('extras', extras);
    S.captureMessage(msg, 'warning');
  } else {
    console.warn('[monitoring] captureMessage:', msg, extras ?? '');
  }
}

/**
 * Extract x-request-id from the request and attach it as a Sentry tag.
 * Call this at the top of API route handlers to correlate Sentry errors
 * with Vercel function logs — both will carry the same request ID,
 * injected by src/middleware.ts.
 *
 * Usage:
 *   export async function POST(req: NextRequest) {
 *     await setRequestContext(req);
 *     ...
 *   }
 */
export async function setRequestContext(req: Request) {
  const requestId = (req.headers as Headers).get('x-request-id');
  if (!requestId) return;
  const S = await getSentry();
  if (S && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    S.setTag('request_id', requestId);
  }
}

/**
 * Wrap an async route handler so unhandled errors are always reported.
 *
 * Usage:
 *   export const POST = withMonitoring(async (req) => { ... });
 */
export function withMonitoring<T extends (...args: Parameters<T>) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      await captureException(err);
      throw err; // re-throw so Next.js still returns 500
    }
  }) as T;
}
