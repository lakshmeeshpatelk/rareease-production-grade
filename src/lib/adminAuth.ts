import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * requireAdmin — verifies the request carries a valid Supabase session
 * whose email matches ADMIN_EMAIL (env var, never exposed to the client).
 *
 * Returns null when the caller is authenticated as admin.
 * Returns a NextResponse (401/500) when they are not.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('[adminAuth] ADMIN_EMAIL env var is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Build a Supabase SSR client that reads cookies from the incoming request.
  // We use a response object to capture any cookie mutations (token refresh).
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null; // authenticated
}
