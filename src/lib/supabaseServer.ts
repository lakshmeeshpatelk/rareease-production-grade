import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * supabaseServer.ts — SSR client (reads/sets cookies for auth sessions)
 * Only import this in Server Components and Route Handlers.
 * For the service-role admin client, import from supabaseAdmin.ts.
 *
 * Compatible with both Next.js 14 (sync cookies()) and Next.js 15 (async cookies()).
 */
export async function createClient() {
  // cookies() is sync in Next 14 and async in Next 15.
  // Awaiting a sync value is a no-op, so this works for both.
  const cookieStore = await cookies();

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
          } catch {
            // Ignored in Server Components — cookies can only be set in Route Handlers
          }
        },
      },
    }
  );
}

// Re-export for backwards compat — API routes that imported createAdminClient
// from here will still work without any changes.
export { createAdminClient } from '@/lib/supabaseAdmin';
