/**
 * src/lib/auditLog.ts
 * Fire-and-forget admin audit logger.
 * Writes to the admin_audit_logs table via service role.
 *
 * Usage:
 *   await writeAuditLog({ action: 'payment.success', resource_id: 'order:RE-123', meta: {...} });
 *
 * Never throws — logs failures to stderr instead of crashing callers.
 */

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseAdmin';

export interface AuditLogEntry {
  action:       string;
  admin_email?: string;
  resource_id?: string;
  meta?:        Record<string, unknown>;
  ip_address?:  string;
  user_agent?:  string;
  request_id?:  string;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('admin_audit_logs').insert({
      action:      entry.action,
      admin_email: entry.admin_email ?? null,
      resource_id: entry.resource_id ?? null,
      meta:        entry.meta        ?? null,
      ip_address:  entry.ip_address  ?? null,
      user_agent:  entry.user_agent  ?? null,
      request_id:  entry.request_id  ?? null,
    });
    if (error) {
      console.error('[auditLog] insert error:', error.message);
    }
  } catch (e: any) {
    // Audit failures must never break the calling route
    console.error('[auditLog] unexpected error:', e.message);
  }
}

/**
 * Convenience wrapper for admin route handlers.
 * Extracts ip_address and user_agent from the NextRequest automatically.
 */
export function logAdminAction(
  action: string,
  opts: {
    adminEmail?: string;
    resource_id?: string;
    meta?: Record<string, unknown>;
    req?: NextRequest;
  } = {}
): void {
  const { adminEmail, resource_id, meta, req } = opts;
  writeAuditLog({
    action,
    admin_email: adminEmail,
    resource_id,
    meta,
    ip_address:  req?.headers.get('x-forwarded-for') ?? req?.headers.get('x-real-ip') ?? undefined,
    user_agent:  req?.headers.get('user-agent') ?? undefined,
  });
}