'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    // During local dev without .env.local, or if env vars weren't set in Vercel,
    // log clearly instead of crashing React.
    console.error(
      '[Rare Ease] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Add them to .env.local (local dev) or Vercel project settings (production).'
    );
    // Return a dummy client that won't throw on method calls
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createBrowserClient(url, key);
}

let _client: ReturnType<typeof createClient> | null = null;
export function getClient() {
  if (!_client) _client = createClient();
  return _client;
}
