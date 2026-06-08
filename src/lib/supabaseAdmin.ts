/**
 * src/lib/supabaseAdmin.ts
 * Service-role Supabase client — SERVER SIDE ONLY.
 * Bypasses RLS entirely. Never import this in any browser/client component.
 *
 * Uses a singleton so we don't create a new client on every request.
 */

import { createClient as _createClient } from '@supabase/supabase-js';

let _adminClient: ReturnType<typeof _createClient> | null = null;

export function createClient(): any {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Check your environment variables.'
    );
  }

  _adminClient = _createClient(url, key, {
    auth: {
      autoRefreshToken:   false,
      persistSession:     false,
      detectSessionInUrl: false,
    },
  });

  return _adminClient;
}

/**
 * Alias for createClient — kept for backward compatibility with imports
 * that use `createAdminClient` throughout the codebase.
 */
export const createAdminClient: () => any = createClient;
