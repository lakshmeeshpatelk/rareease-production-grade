import { createClient } from '@supabase/supabase-js';

/**
 * supabaseAdmin.ts — Service-role client (server-side only)
 *
 * No import from 'next/headers' — safe to appear in the module graph of
 * any async-imported module (e.g. db.ts) even when called from a client
 * component. The service-role key never reaches the browser because
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables.\n' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      'are set in your Vercel project settings (or .env.local for local dev).'
    );
  }

  return createClient(url, key);
}
