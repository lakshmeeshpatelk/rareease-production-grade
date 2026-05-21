-- ═══════════════════════════════════════════════════════════════════════════
-- rareease-audit-migration.sql
-- Migration v2 — Admin audit logging
--
-- Run this AFTER the main schema (rareease-schema.sql) and initial additions
-- (rareease-additions.sql) are applied.
--
-- Apply via Supabase SQL editor or:
--   psql $DATABASE_URL -f rareease-audit-migration.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Admin audit log ─────────────────────────────────────────────────────────
-- Every mutating admin action is recorded here. Never delete rows.
-- Append-only table: no UPDATE or DELETE access via RLS.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           BIGSERIAL     PRIMARY KEY,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  action       TEXT          NOT NULL,       -- e.g. 'admin.login', 'product.update'
  admin_email  TEXT,                         -- who performed the action
  resource_id  TEXT,                         -- e.g. 'product:abc123', 'order:RE123'
  meta         JSONB,                        -- arbitrary extra context
  ip_address   TEXT,                         -- client IP (from x-forwarded-for)
  user_agent   TEXT,                         -- browser / client user-agent
  request_id   TEXT                          -- x-request-id for cross-log correlation
);

-- Index for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email  ON admin_audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id  ON admin_audit_logs (resource_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role (used by the Next.js server) can INSERT only.
-- SELECT is reserved for the Supabase dashboard / direct DB access.
-- No UPDATE, no DELETE — this table is append-only by design.
CREATE POLICY "service_role_insert_audit" ON admin_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated admin users may read their own logs if needed via the dashboard.
-- For now, only service_role can insert; reads go through the Supabase dashboard.
CREATE POLICY "no_anon_access" ON admin_audit_logs
  FOR ALL
  TO anon
  USING (false);

-- ── orders: add email_sent flag ──────────────────────────────────────────────
-- Guards against duplicate order confirmation emails being sent if the webhook
-- fires unexpectedly for an order whose email was already sent in create/route.ts.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN orders.email_sent IS
  'Set to TRUE after the order confirmation email is dispatched. '
  'Prevents duplicate emails if the payment webhook fires for an already-emailed order.';

-- ── Helpful reminder ─────────────────────────────────────────────────────────
-- After applying this migration, ensure UPSTASH_REDIS_REST_URL and
-- UPSTASH_REDIS_REST_TOKEN are set in your Vercel environment variables.
-- The app will warn loudly in logs if they are missing in production.
