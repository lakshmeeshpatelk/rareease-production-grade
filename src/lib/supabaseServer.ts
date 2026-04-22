import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * supabaseServer.ts — SSR client (reads/sets cookies for auth sessions)
 * Only import this in Server Components and Route Handlers.
 * For the service-role admin client, import from supabaseAdmin.ts.
 */

// Next.js 14: cookies() is synchronous — no await
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Re-export for backwards compat — API routes that imported createAdminClient
// from here will still work without any changes.
export { createAdminClient } from '@/lib/supabaseAdmin';
