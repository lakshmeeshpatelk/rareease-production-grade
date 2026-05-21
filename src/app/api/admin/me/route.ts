import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

/**
 * GET /api/admin/me
 * Lightweight session check — returns 200 if the request carries a valid
 * admin session, 401/403 otherwise. Used by checkAuth() in adminStore.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;
  return NextResponse.json({ ok: true });
}
