/**
 * src/lib/supabaseServer.ts
 * Cookie-based SSR Supabase client for:
 *  - Next.js Server Components
 *  - Route Handlers that need the authenticated user's session
 *
 * Uses the anon key + reads the user's JWT from cookies.
 * RLS is fully enforced using the user's session.
 *
 * DO NOT use this for admin operations — use supabaseAdmin.ts instead.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabaseServer] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignore errors thrown when called from a Server Component
          // (read-only cookie store). Route Handlers can set cookies fine.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Same as above
        }
      },
    },
  });
}