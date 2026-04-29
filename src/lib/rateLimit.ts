/**
 * rateLimit.ts — Redis-backed rate limiter using Upstash.
 * Falls back to in-memory (dev/no-config) so local dev still works.
 *
 * REQUIRED ENV VARS (Upstash Redis):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Install: npm install @upstash/redis @upstash/ratelimit
 */

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// ── In-memory fallback (dev only) ─────────────────────────────────
interface RateLimitRecord { count: number; resetAt: number }
const localStore = new Map<string, RateLimitRecord>();
function localIsRateLimited(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const rec = localStore.get(key);
  if (!rec || now > rec.resetAt) {
    localStore.set(key, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > opts.limit;
}

// ── Redis-backed limiter via Upstash REST API ──────────────────────
// We call the REST API directly (no Node.js net/tls) so it works in
// Next.js edge-compatible serverless functions on Vercel.
async function redisIsRateLimited(key: string, opts: RateLimitOptions): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(opts.windowMs / 1000);

  // MULTI-EXEC: INCR + EXPIRE atomically via pipeline
  const pipeline = [
    ['INCR', key],
    ['EXPIRE', key, String(windowSec), 'NX'],
  ];

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
  });

  if (!res.ok) {
    console.error('[rateLimit] Upstash request failed, falling back to allow:', await res.text());
    return false; // fail open — don't block users on Redis errors
  }

  const data = (await res.json()) as Array<{ result: number }>;
  const count = data[0]?.result ?? 0;
  return count > opts.limit;
}

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Warn at module load time in production if Redis is unconfigured.
// The in-memory fallback does NOT persist across Vercel serverless instances —
// each cold-started function has its own isolated store, so the effective limit
// is per-instance, not per-IP. Fine in dev; dangerous in multi-instance prod.
if (!hasRedis && process.env.NODE_ENV === 'production') {
  console.warn(
    '[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
    'Falling back to per-instance in-memory rate limiting — NOT effective across ' +
    'multiple Vercel serverless instances. Set Upstash credentials immediately.'
  );
}

/**
 * Returns true if the key is over its rate limit.
 * Uses Upstash Redis in production; falls back to in-memory for local dev.
 */
export async function isRateLimited(key: string, opts: RateLimitOptions): Promise<boolean> {
  if (hasRedis) {
    try {
      return await redisIsRateLimited(key, opts);
    } catch (err) {
      console.error('[rateLimit] Redis error, falling back to in-memory:', err);
      return localIsRateLimited(key, opts);
    }
  }
  return localIsRateLimited(key, opts);
}

/** Extract a best-effort IP from request headers */
export function getIP(req: Request): string {
  return (
    (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// Pre-configured limiters for common routes
// Pre-configured limiters for common routes
export const LIMITS: Record<string, RateLimitOptions> = {
  /** Payment creation — 10 per 10 min per IP */
  payments: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Coupon validation — 20 per 5 min per IP */
  coupons:  { limit: 20, windowMs:  5 * 60 * 1000 },
  /** General API — 60 per min per IP */
  general:  { limit: 60, windowMs:      60 * 1000 },
};