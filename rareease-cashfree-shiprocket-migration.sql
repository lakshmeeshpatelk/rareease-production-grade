-- ══════════════════════════════════════════════════════════════════
--  RARE EASE — Cashfree + Shiprocket Migration
--  Run this in Supabase SQL Editor AFTER deploying the new code.
--  Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards).
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Add Cashfree columns ────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashfree_order_id   text,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id text;

-- ── 2. Add Shiprocket columns ──────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id    bigint,
  ADD COLUMN IF NOT EXISTS shiprocket_shipment_id bigint,
  ADD COLUMN IF NOT EXISTS awb_code               text;

-- ── 3. Indexes for new columns ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_cashfree     ON public.orders(cashfree_order_id)   WHERE cashfree_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_awb          ON public.orders(awb_code)            WHERE awb_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_sr_order     ON public.orders(shiprocket_order_id) WHERE shiprocket_order_id IS NOT NULL;

-- ── 4. Drop old Razorpay indexes ───────────────────────────────────
-- Run only after confirming NO pending orders have razorpay_order_id set:
--   SELECT COUNT(*) FROM orders WHERE razorpay_order_id IS NOT NULL AND payment_status != 'paid';
-- Then uncomment:
-- DROP INDEX IF EXISTS idx_orders_rzp;

-- ── 5. Rename / keep Razorpay columns for historical records ───────
-- We keep razorpay_order_id and razorpay_payment_id for existing paid orders.
-- They will be NULL on all new orders. Drop only when you no longer need history:
-- ALTER TABLE public.orders
--   DROP COLUMN IF EXISTS razorpay_order_id,
--   DROP COLUMN IF EXISTS razorpay_payment_id;

-- ── 6. Ensure shipping_events table is up to date ──────────────────
CREATE TABLE IF NOT EXISTS public.shipping_events (
  id         bigserial primary key,
  order_id   text references public.orders(id) on delete cascade not null,
  awb        text,
  status     text not null,
  location   text,
  event_at   timestamptz not null default now(),
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_order ON public.shipping_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_awb   ON public.shipping_events(awb);

ALTER TABLE public.shipping_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own shipping events" ON public.shipping_events;
CREATE POLICY "own shipping events" ON public.shipping_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Service role can write shipping events (webhook handler)
GRANT SELECT, INSERT ON public.shipping_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.shipping_events_id_seq TO service_role;

-- ── 7. Update payment_method check to confirm 'online' still valid ─
-- No change needed — 'online' still covers Cashfree.

-- ── 8. Verification query — run after migration ────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- ORDER BY ordinal_position;
