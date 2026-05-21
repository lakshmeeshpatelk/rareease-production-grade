-- ══════════════════════════════════════════════════════════════════
--  RARE EASE — Complete Database Schema
--  PostgreSQL 15 / Supabase — run this entire file once in
--  SQL Editor → New Query. Idempotent: safe to re-run.
-- ══════════════════════════════════════════════════════════════════
--
--  FIX LOG (vs original):
--  1. Removed uuid-ossp extension — gen_random_uuid() is built-in
--  2. execute procedure → execute function (deprecated since PG 11)
--  3. Added updated_at trigger on inventory table
--  4. decrement_inventory now raises exception on oversell
--     instead of silently flooring at 0
--  5. Added INSERT policy on order_items
--  6. exchange_requests RLS now covers guest orders (user_id IS NULL)
--  7. Added GRANT statements so anon/authenticated read catalogue
--  8. Added check constraint on product_media.type
--  9. Added updated_at trigger on site_settings
-- ══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
--  TABLES
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table if not exists public.categories (
  id            text primary key,
  slug          text unique not null,
  name          text not null,
  label         text not null,
  description   text,
  hero_badge    text,
  card_class    text default 'card-street',
  pattern_class text default 'card-pattern-1',
  is_active     boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

create table if not exists public.products (
  id             text primary key,
  category_id    text references categories(id),
  name           text not null,
  slug           text unique not null,
  tagline        text,
  description    text,
  price          integer not null check (price > 0),
  original_price integer check (original_price is null or original_price > 0),
  badge          text,
  is_featured    boolean default false,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active   on products(is_active);
create index if not exists idx_products_featured on products(is_featured);
create index if not exists idx_products_created  on products(created_at desc);

-- FIX 8: type column has check constraint
create table if not exists public.product_media (
  id          uuid default gen_random_uuid() primary key,
  product_id  text references products(id) on delete cascade,
  url         text not null,
  type        text default 'image' check (type in ('image','video')),
  position    integer default 0,
  alt_text    text,
  created_at  timestamptz default now()
);

create index if not exists idx_product_media_product on product_media(product_id);

create table if not exists public.variants (
  id          text primary key,
  product_id  text references products(id) on delete cascade,
  size        text not null check (size in ('XS','S','M','L','XL','XXL')),
  sku         text unique,
  created_at  timestamptz default now()
);

create index if not exists idx_variants_product on variants(product_id);

create table if not exists public.inventory (
  id          uuid default gen_random_uuid() primary key,
  variant_id  text references variants(id) on delete cascade unique,
  quantity    integer default 0 check (quantity >= 0),
  reserved    integer default 0 check (reserved >= 0),
  updated_at  timestamptz default now()
);

create table if not exists public.addresses (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  label       text,
  name        text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  pincode     text not null,
  phone       text,
  is_default  boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_addresses_user on addresses(user_id);

create table if not exists public.coupons (
  id          uuid default gen_random_uuid() primary key,
  code        text unique not null,
  type        text not null check (type in ('percent','flat')),
  value       integer not null check (value > 0),
  min_order   integer default 0,
  max_uses    integer default 9999,
  used_count  integer default 0,
  active      boolean default true,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);

create table if not exists public.orders (
  id                  text primary key,
  user_id             uuid references auth.users(id) on delete set null,
  status              text default 'pending'
    check (status in ('pending','processing','shipped','delivered','cancelled','refunded')),
  payment_status      text default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  payment_method      text default 'online'
    check (payment_method in ('online','cod')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  coupon_code         text,
  discount_amount     integer default 0,
  subtotal            integer not null,
  shipping            integer default 0,
  total               integer not null,
  shipping_address    jsonb not null,
  tracking_number     text,
  courier             text,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_orders_user    on orders(user_id);
create index if not exists idx_orders_status  on orders(status);
create index if not exists idx_orders_payment on orders(payment_status);
create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_orders_rzp     on orders(razorpay_order_id);

create table if not exists public.order_items (
  id          uuid default gen_random_uuid() primary key,
  order_id    text references orders(id) on delete cascade,
  product_id  text references products(id) on delete set null,
  variant_id  text references variants(id) on delete set null,
  quantity    integer not null check (quantity > 0),
  price       integer not null check (price > 0)
);

create index if not exists idx_order_items_order on order_items(order_id);

create table if not exists public.reviews (
  id                   uuid default gen_random_uuid() primary key,
  product_id           text references products(id) on delete cascade,
  user_id              uuid references auth.users(id) on delete set null,
  order_id             text references orders(id) on delete set null,
  reviewer_name        text,
  rating               integer not null check (rating between 1 and 5),
  title                text,
  body                 text not null,
  is_verified_purchase boolean default false,
  is_approved          boolean default false,
  created_at           timestamptz default now()
);

create index if not exists idx_reviews_product  on reviews(product_id);
create index if not exists idx_reviews_approved on reviews(is_approved);

create table if not exists public.review_images (
  id        uuid default gen_random_uuid() primary key,
  review_id uuid references reviews(id) on delete cascade,
  url       text not null
);

create table if not exists public.wishlists (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  product_id  text references products(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(user_id, product_id)
);

create index if not exists idx_wishlists_user on wishlists(user_id);

create table if not exists public.exchange_requests (
  id             uuid default gen_random_uuid() primary key,
  order_id       text references orders(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  type           text not null check (type in ('exchange','cancellation')),
  reason         text not null,
  reason_label   text,
  items          jsonb,
  want_size      text,
  status         text default 'pending'
    check (status in ('pending','approved','rejected','completed')),
  delivered_at   timestamptz,
  within_window  boolean default true,
  shipping_by    text default 'customer' check (shipping_by in ('rareease','customer')),
  proof_note     text,
  admin_note     text,
  requested_at   timestamptz default now()
);

create index if not exists idx_exchange_order  on exchange_requests(order_id);
create index if not exists idx_exchange_status on exchange_requests(status);

create table if not exists public.shipping_events (
  id       uuid default gen_random_uuid() primary key,
  order_id text references orders(id) on delete cascade,
  awb      text,
  status   text not null,
  location text,
  remarks  text,
  event_at timestamptz default now()
);

create index if not exists idx_shipping_order on shipping_events(order_id);
create index if not exists idx_shipping_awb   on shipping_events(awb);

create table if not exists public.notify_me (
  id         uuid default gen_random_uuid() primary key,
  product_id text references products(id) on delete cascade,
  variant_id text references variants(id) on delete cascade,
  email      text not null,
  size       text,
  notified   boolean default false,
  created_at timestamptz default now(),
  unique(variant_id, email)
);

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);


-- ══════════════════════════════════════════════════════════════════
--  FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════════

-- FIX 2: Generic updated_at using execute function (not deprecated procedure)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Orders
drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function public.set_updated_at();

-- FIX 3: Inventory now has its own updated_at trigger
drop trigger if exists inventory_updated_at on inventory;
create trigger inventory_updated_at
  before update on inventory
  for each row execute function public.set_updated_at();

-- FIX 9: site_settings updated_at
drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- FIX 2: execute function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- FIX 4: decrement_inventory raises on insufficient stock (no silent floor)
create or replace function public.decrement_inventory(p_variant_id text, p_qty integer)
returns void language plpgsql security definer as $$
declare
  v_qty integer;
begin
  select quantity into v_qty
    from inventory
   where variant_id = p_variant_id
   for update;

  if not found then
    raise exception 'Inventory row not found for variant %', p_variant_id;
  end if;

  if v_qty < p_qty then
    raise exception 'Insufficient stock for variant %. Available: %, Requested: %',
      p_variant_id, v_qty, p_qty;
  end if;

  update inventory
     set quantity = quantity - p_qty
   where variant_id = p_variant_id;
end;
$$;

-- Atomically increment coupon usage
create or replace function public.increment_coupon_usage(p_code text)
returns boolean language plpgsql security definer as $$
declare
  v_max    integer;
  v_used   integer;
  v_active boolean;
begin
  select max_uses, used_count, active
    into v_max, v_used, v_active
    from coupons
   where code = upper(p_code)
   for update;

  if not found or not v_active then return false; end if;
  if v_used >= v_max              then return false; end if;

  update coupons set used_count = used_count + 1 where code = upper(p_code);
  return true;
end;
$$;


-- ══════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

alter table profiles          enable row level security;
alter table addresses         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table wishlists         enable row level security;
alter table reviews           enable row level security;
alter table review_images     enable row level security;
alter table exchange_requests enable row level security;
alter table notify_me         enable row level security;
alter table products          enable row level security;
alter table categories        enable row level security;
alter table variants          enable row level security;
alter table inventory         enable row level security;
alter table product_media     enable row level security;
alter table coupons           enable row level security;
alter table shipping_events   enable row level security;
alter table site_settings     enable row level security;

-- Profiles
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id);

-- Addresses
drop policy if exists "own addresses" on addresses;
create policy "own addresses" on addresses for all using (auth.uid() = user_id);

-- Orders
drop policy if exists "own orders select" on orders;
create policy "own orders select" on orders for select using (auth.uid() = user_id);

drop policy if exists "insert order" on orders;
create policy "insert order" on orders for insert
  with check (auth.uid() = user_id or user_id is null);

-- Order items
drop policy if exists "own order items" on order_items;
create policy "own order items" on order_items for select
  using (order_id in (select id from orders where user_id = auth.uid()));

-- FIX 5: explicit insert policy (service role bypasses anyway, this is belt-and-suspenders)
drop policy if exists "service insert order items" on order_items;
create policy "service insert order items" on order_items for insert with check (true);

-- Wishlists
drop policy if exists "own wishlist" on wishlists;
create policy "own wishlist" on wishlists for all using (auth.uid() = user_id);

-- Reviews
drop policy if exists "read approved reviews" on reviews;
create policy "read approved reviews" on reviews for select using (is_approved = true);

drop policy if exists "insert review" on reviews;
create policy "insert review" on reviews for insert with check (true);

drop policy if exists "update own review" on reviews;
create policy "update own review" on reviews for update using (auth.uid() = user_id);

-- Review images
drop policy if exists "read review images" on review_images;
create policy "read review images" on review_images for select
  using (review_id in (select id from reviews where is_approved = true));

drop policy if exists "insert review images" on review_images;
create policy "insert review images" on review_images for insert with check (true);

-- FIX 6: exchange_requests — separate select/insert policies, guests allowed
drop policy if exists "own exchange requests" on exchange_requests;
drop policy if exists "own exchange requests select" on exchange_requests;
drop policy if exists "own exchange requests insert" on exchange_requests;

create policy "own exchange requests select" on exchange_requests for select
  using (auth.uid() = user_id or user_id is null);

create policy "own exchange requests insert" on exchange_requests for insert
  with check (auth.uid() = user_id or user_id is null);

-- Notify me
drop policy if exists "insert notify me" on notify_me;
create policy "insert notify me" on notify_me for insert with check (true);

drop policy if exists "own notify me" on notify_me;
create policy "own notify me" on notify_me for select
  using (email = (select email from auth.users where id = auth.uid()));

-- Public catalogue reads
drop policy if exists "public read products"   on products;
drop policy if exists "public read categories" on categories;
drop policy if exists "public read variants"   on variants;
drop policy if exists "public read inventory"  on inventory;
drop policy if exists "public read media"      on product_media;

create policy "public read products"   on products      for select using (is_active = true);
create policy "public read categories" on categories    for select using (is_active = true);
create policy "public read variants"   on variants      for select using (true);
create policy "public read inventory"  on inventory     for select using (true);
create policy "public read media"      on product_media for select using (true);

-- Shipping events
drop policy if exists "own shipping events" on shipping_events;
create policy "own shipping events" on shipping_events for select
  using (order_id in (select id from orders where user_id = auth.uid()));

-- Site settings
drop policy if exists "public read site_settings" on site_settings;
create policy "public read site_settings" on site_settings for select using (true);

-- Coupons: no client policy — service role only via API routes


-- ══════════════════════════════════════════════════════════════════
--  GRANTS
--  FIX 7: explicit grants so anon + authenticated can read catalogue
-- ══════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

grant select on public.products, public.categories, public.variants,
               public.inventory, public.product_media,
               public.site_settings, public.reviews, public.review_images
  to anon, authenticated;

grant select, insert, update, delete
  on public.profiles, public.addresses, public.wishlists,
     public.notify_me, public.exchange_requests
  to authenticated;

grant select, insert on public.orders, public.order_items to authenticated;
grant select         on public.shipping_events             to authenticated;
grant insert         on public.reviews, public.review_images to anon, authenticated;


-- ══════════════════════════════════════════════════════════════════
--  SEED CATEGORIES (idempotent)
-- ══════════════════════════════════════════════════════════════════

insert into categories (id, slug, name, label, description, hero_badge, card_class, pattern_class) values
  ('cat-1','mens-oversized',   'Men''s Oversized T-Shirt',  'Men''s',              'Premium oversized tees for men.',    'MOT','card-street',   'card-pattern-1'),
  ('cat-2','womens-oversized', 'Women''s Oversized T-Shirt','Women''s',            'Premium oversized tees for women.',  'WOT','card-women',    'card-pattern-2'),
  ('cat-3','mens-sleeveless',  'Men''s Sleeveless T-Shirt', 'Men''s',              'Sleeveless tees for men.',           'MSL','card-drift',    'card-pattern-3'),
  ('cat-4','womens-sleeveless','Women''s Sleeveless T-Shirt','Women''s',           'Sleeveless tees for women.',         'WSL','card-archive',  'card-pattern-4'),
  ('cat-5','mens-combo',       'Men''s Combo',              'Men''s · 2-Piece Set','Matching sets for men.',             'MC', 'card-minimal',  'card-pattern-1'),
  ('cat-6','womens-combo',     'Women''s Combo',            'Women''s · 2-Piece Set','Matching sets for women.',         'WC', 'card-oversized','card-pattern-2')
on conflict (id) do nothing;


-- ══════════════════════════════════════════════════════════════════
--  SEED SITE SETTINGS (idempotent)
-- ══════════════════════════════════════════════════════════════════

insert into site_settings (key, value) values
  ('announcements', '[{"id":1,"text":"✦ Free shipping pan India on all orders ✦","active":true},{"id":2,"text":"✦ SS25 Drop is live — limited stock ✦","active":true},{"id":3,"text":"✦ New drops every Friday · @rareeaseofficial ✦","active":true}]'),
  ('hero_slides',   '[{"id":1,"src":"/hero/slide-1.jpg","label":"Drift Culture","sub":"Women''s Combo Set","ctaText":"Shop Now","ctaLink":"#shop","active":true},{"id":2,"src":"/hero/slide-2.jpg","label":"Never Stop","sub":"Women''s Oversized Tee — Back","ctaText":"Shop Now","ctaLink":"#shop","active":true},{"id":3,"src":"/hero/slide-3.jpg","label":"Street Core","sub":"Women''s Combo — Side","ctaText":"Shop Now","ctaLink":"#shop","active":true},{"id":4,"src":"/hero/slide-4.jpg","label":"Graphic Archive","sub":"Women''s Oversized Tee","ctaText":"Shop Now","ctaLink":"#shop","active":true},{"id":5,"src":"/hero/slide-5.jpg","label":"Surf California","sub":"Men''s Oversized Tee","ctaText":"Shop Now","ctaLink":"#shop","active":true},{"id":6,"src":"/hero/slide-6.jpg","label":"Heartbeat","sub":"Men''s Oversized Tee","ctaText":"Shop Now","ctaLink":"#shop","active":false}]')
on conflict (key) do nothing;
