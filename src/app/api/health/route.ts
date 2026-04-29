/**
 * GET /api/health
 * Lightweight health-check endpoint for uptime monitors (UptimeRobot, BetterUptime, etc.)
 * Returns 200 with a JSON payload — fast enough to not trigger timeouts.
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // runs at the edge — sub-millisecond cold start

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'rareease',
      region: process.env.VERCEL_REGION ?? 'unknown',
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  );
}
