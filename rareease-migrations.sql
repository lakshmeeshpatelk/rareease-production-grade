-- ══════════════════════════════════════════════════════════════════
--  RARE EASE — Migrations
--
--  All migrations have been consolidated into rareease-schema.sql.
--  You only need to run ONE file:
--
--      rareease-schema.sql
--
--  It is fully idempotent (safe to re-run) and includes:
--    • All tables, indexes, check constraints
--    • All functions and triggers
--    • All RLS policies and grants
--    • Seed data for categories and site_settings
--
--  This file is kept for reference only.
-- ══════════════════════════════════════════════════════════════════
-- Add image_url to categories (run if not already applied)
alter table public.categories
  add column if not exists image_url text;