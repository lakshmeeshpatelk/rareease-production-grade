/**
 * src/lib/rateLimit.ts
 *
 * Rate limiter using Upstash Redis (HTTP-based, works in Edge + Node).
 * Falls back to an in-memory Map if Redis is not configured —
 * suitable for development / single-instance deployments.
 *
 * Returns true if the request should be BLOCKED (limit exceeded).
 */

type InMemoryEntry = { count: number; reset: number };
const inMemoryStore = new Map<string, InMemoryEntry>();

async function redisIncr(key: string, windowSec: number): Promise<number | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // Upstash REST pipeline: INCR + EXPIRE in one HTTP call
    const res = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR',   key],
        ['EXPIRE', key, windowSec],
      ]),
    });
    const data: any[] = await res.json();
    return data?.[0]?.result ?? null;
  } catch {
    return null;
  }
}

/**
 * @param key       Unique rate-limit key (e.g. "pay:1.2.3.4")
 * @param limit     Max allowed calls within the window
 * @param windowSec Rolling window in seconds
 * @returns true if the request should be BLOCKED
 */
export async function checkRateLimit(
  key:       string,
  limit:     number,
  windowSec: number,
): Promise<boolean> {
  // Try Redis first
  const redisCount = await redisIncr(key, windowSec);
  if (redisCount !== null) {
    return redisCount > limit;
  }

  // Fallback: in-memory (per-process, resets on server restart)
  const now   = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.reset) {
    inMemoryStore.set(key, { count: 1, reset: now + windowSec * 1000 });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}


import { NextRequest } from 'next/server';

export function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export const LIMITS = {
  payments: { limit: 10, windowSec: 600 },
  general:  { limit: 30, windowSec: 60  },
};

export async function isRateLimited(
  key: string,
  config: { limit: number; windowSec: number },
): Promise<boolean> {
  return checkRateLimit(key, config.limit, config.windowSec);
}