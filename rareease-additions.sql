-- ══════════════════════════════════════════════════════════════════
--  RARE EASE — Additional SQL to run in Supabase SQL Editor
--  Run this AFTER rareease-schema.sql
--  Safe to re-run (idempotent)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. product_media: allow service role to write ─────────────────
drop policy if exists "admin write media" on product_media;
create policy "admin write media" on product_media
  for all
  using (true)
  with check (true);

-- ── 2. Supabase Storage bucket policy ─────────────────────────────
-- Run this AFTER creating the "product-images" bucket in the
-- Supabase Dashboard → Storage → New Bucket (set to Public)
--
-- Allow anyone to read product images
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update set public = true;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "service role write product images" on storage.objects;
create policy "service role write product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "service role delete product images" on storage.objects;
create policy "service role delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');

-- ── 3. Index for COD fraud check (phone lookup in jsonb) ──────────
-- Makes the COD fraud phone check fast (searches shipping_address->>'phone')
create index if not exists idx_orders_cod_phone
  on orders ((shipping_address->>'phone'))
  where payment_method = 'cod';

-- ── 4. Index for pending orders lookup ────────────────────────────
create index if not exists idx_orders_status_method
  on orders (payment_method, status, created_at desc);

-- ── 5. Auto-cancel stale pending online orders (optional cron) ────
-- If you have Supabase cron (pg_cron) enabled, run this to auto-cancel
-- online payment orders that were never completed after 30 minutes.
-- Uncomment to enable:
--
select cron.schedule(
  'cancel-stale-orders',
  '*/15 * * * *',
  $$
    update orders
    set status = 'cancelled', payment_status = 'failed'
    where payment_method = 'online'
      and payment_status = 'pending'
      and status = 'pending'
      and created_at < now() - interval '30 minutes';
  $$
);

-- ── 6. Useful view for admin dashboard (optional) ─────────────────
create or replace view public.order_summary as
  select
    o.id,
    o.status,
    o.payment_status,
    o.payment_method,
    o.total,
    o.created_at,
    o.shipping_address->>'name'  as customer_name,
    o.shipping_address->>'phone' as customer_phone,
    o.shipping_address->>'email' as customer_email,
    o.shipping_address->>'city'  as city,
    count(oi.id)                 as item_count
  from orders o
  left join order_items oi on oi.order_id = o.id
  group by o.id;

-- Grant read to service role
grant select on public.order_summary to service_role;

-- ── 7. User notifications table ──────────────────────────────────
-- Persists order/drop/alert notifications per user across sessions.
create table if not exists public.user_notifications (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null check (type in ('drop','sale','order','alert')),
  icon        text not null default '🔔',
  msg         text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_user_notif_user on user_notifications(user_id, created_at desc);

alter table user_notifications enable row level security;

drop policy if exists "own notifications" on user_notifications;
create policy "own notifications" on user_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow service role to insert notifications (e.g. order confirmation)
grant select, insert, update, delete on public.user_notifications to authenticated;
grant usage, select on sequence public.user_notifications_id_seq to authenticated;
