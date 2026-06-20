/**
 * src/lib/supabase.ts
 * Browser-side Supabase client — safe to use in Client Components.
 * Uses the anon key only. RLS is fully enforced.
 *
 * Uses a singleton so we don't create a new client on every render.
 */

import { createBrowserClient } from '@supabase/ssr';

let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your environment variables.'
    );
  }

  _browserClient = createBrowserClient(url, key);
  return _browserClient;
}

/**
 * Alias for createClient — kept for backward compatibility with imports
 * that use `getClient` throughout the codebase.
 */
export const getClient = createClient;