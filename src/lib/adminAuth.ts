/**
 * src/lib/adminAuth.ts
 * Validates that the calling request is from a logged-in admin user.
 *
 * Usage in any admin API route:
 *
 *   const auth = await requireAdmin(req);
 *   if (auth) return auth; // NextResponse with 401/403/500
 *
 * Checks:
 *  1. Session cookie is valid (Supabase SSR)
 *  2. User email matches ADMIN_EMAIL env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Returns a NextResponse error if the request is not from a valid admin,
 * or null if authentication passes.
 *
 * Usage in any admin API route:
 *
 *   const auth = await requireAdmin(req);
 *   if (auth) return auth;
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!ADMIN_EMAIL) {
    console.error('[adminAuth] ADMIN_EMAIL env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Build a cookie-aware Supabase client from the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        // set/remove are no-ops in API routes (we don't need to mutate cookies here)
        set(_name: string, _value: string, _opts: CookieOptions) {},
        remove(_name: string, _opts: CookieOptions) {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
  }

  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  return null;
}