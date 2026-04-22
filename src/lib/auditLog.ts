/**
 * auditLog.ts — Lightweight admin audit logger.
 *
 * Every mutating admin action (login, product edit, order status change, etc.)
 * should call logAdminAction(). Entries land in admin_audit_logs and give you
 * a full trail of who did what and when — critical for a production e-commerce
 * admin panel.
 *
 * The table schema is in rareease-audit-migration.sql.
 * The logger fails silently (never throws) so it can never break a real action.
 */

import { createAdminClient } from '@/lib/supabaseAdmin';

export type AdminAction =
  | 'admin.login'
  | 'admin.logout'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'order.status_update'
  | 'order.cancel'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'coupon.create'
  | 'coupon.update'
  | 'coupon.delete'
  | 'review.approve'
  | 'review.delete'
  | 'exchange.update'
  | 'content.update'
  | string; // allow ad-hoc strings for one-off actions

export interface AuditContext {
  /** Supabase user ID of the admin performing the action */
  adminEmail?: string;
  /** The resource being affected, e.g. "product:abc123" or "order:RE123" */
  resourceId?: string;
  /** Arbitrary extra context to store alongside the log entry */
  meta?: Record<string, unknown>;
  /** The incoming request (used to extract IP and User-Agent) */
  req?: Request;
}

/**
 * Log an admin action to the admin_audit_logs table.
 * Safe to call without awaiting — errors are caught and logged to console.
 */
export function logAdminAction(
  action: AdminAction,
  ctx: AuditContext = {}
): void {
  // Fire-and-forget — never block the response
  _write(action, ctx).catch(err =>
    console.error('[auditLog] Failed to write audit entry:', err)
  );
}

async function _write(action: AdminAction, ctx: AuditContext) {
  const ip = ctx.req
    ? (ctx.req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ??
      (ctx.req.headers as Headers).get('x-real-ip') ??
      'unknown'
    : 'unknown';

  const ua = ctx.req
    ? (ctx.req.headers as Headers).get('user-agent') ?? null
    : null;

  const requestId = ctx.req
    ? (ctx.req.headers as Headers).get('x-request-id') ?? null
    : null;

  const supabase = createAdminClient();

  await supabase.from('admin_audit_logs').insert({
    action,
    admin_email:  ctx.adminEmail  ?? null,
    resource_id:  ctx.resourceId  ?? null,
    meta:         ctx.meta        ?? null,
    ip_address:   ip,
    user_agent:   ua,
    request_id:   requestId,
  });
}
