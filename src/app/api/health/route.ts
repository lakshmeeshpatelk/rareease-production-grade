/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for uptime monitors (UptimeRobot, etc.).
 * Also audits that all required environment variables are present.
 *
 * Returns 200 always so monitors don't false-alert on missing env vars —
 * but the body will say "degraded" so you can catch it in logs.
 *
 * Runs on the Edge runtime for minimal cold-start latency.
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'SHIPROCKET_EMAIL',
  'SHIPROCKET_PASSWORD',
  'SHIPROCKET_PICKUP_LOCATION',
  'SHIPROCKET_WEBHOOK_TOKEN',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_APP_ENV',
  'NEXT_PUBLIC_APP_URL',
];

export function GET() {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // Log to Vercel runtime logs — key names are safe to log server-side
    console.error('[health] Missing environment variables:', missing.join(', '));

    return NextResponse.json(
      {
        status:  'degraded',
        reason:  'missing_env_vars',
        count:   missing.length,
        // Don't expose key names in the public response
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: 'ok',
      env:    process.env.NEXT_PUBLIC_APP_ENV ?? 'unknown',
      ts:     Date.now(),
    },
    { status: 200 }
  );
}