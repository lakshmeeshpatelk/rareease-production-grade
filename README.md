<div align="center">

# RARE EASE
### Wear The Rare. Feel The Ease.

**Production-grade luxury streetwear e-commerce — deployed on Vercel**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Live-blue?style=flat-square)](https://razorpay.com/)
[![Shiprocket](https://img.shields.io/badge/Shiprocket-Logistics-orange?style=flat-square)](https://shiprocket.in/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![Sentry](https://img.shields.io/badge/Monitored-Sentry-purple?style=flat-square&logo=sentry)](https://sentry.io/)

</div>

---

## Overview

Rare Ease is a production-deployed luxury streetwear e-commerce platform built with Next.js 14 App Router. It handles the complete commerce lifecycle — product discovery, cart, checkout, online payments, COD, order confirmation emails, automated shipping via Shiprocket, admin management, and post-payment webhooks — with a full suite of security controls, audit logging, and CI/CD.

The architecture is a nonce-secured, edge-middleware-fronted SPA with server-side price validation, idempotent webhook handling, distributed rate limiting via Redis, per-request distributed tracing through Sentry, and direct browser-to-Supabase Storage image uploads (bypassing Vercel's 4MB body limit).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Custom CSS + Tailwind utilities |
| Animation | Framer Motion + CSS animations |
| State | Zustand (cart, wishlist, UI, admin) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (SSR cookie-based sessions) |
| Storage | Supabase Storage (3 buckets: product-images, hero-images, category-images) |
| Payments | Razorpay (orders, webhooks, HMAC verification) |
| Logistics | Shiprocket (automated order push, shipment status webhooks) |
| Email | Resend (transactional order confirmation) |
| Rate limiting | Upstash Redis (serverless, edge-compatible) |
| Error monitoring | Sentry (client + server + edge, source maps) |
| Hosting | Vercel (region: bom1 — Mumbai) |
| CI/CD | GitHub Actions (typecheck → unit → deploy → E2E → Lighthouse) |

---

## Features

### Storefront
- Cinematic hero slideshow with swipe support, auto-advance, and admin-editable slides
- Infinite marquee announcement strip
- 6-category collection grid with hover effects
- Trending / top-sellers section
- Brand story and process sections
- Custom enquiry form

### Shopping Experience
- Full-screen category overlay per collection
- Full collection browse (all categories, filter by size)
- Product detail overlay — zoom gallery, size selector, reviews, accordions, size guide
- Cart drawer with real-time inventory awareness
- Wishlist panel with persistence
- Recently viewed products
- Search overlay with live results
- Coupon code validation (percent and flat discounts)
- Pincode serviceability check

### Checkout & Payments
- Multi-step checkout overlay with address form
- Online payment via Razorpay (card, UPI, netbanking, wallets)
- Cash on Delivery with fraud guards (₹2,000 limit, pending order block, cancelled order history check)
- Server-side price validation — client-submitted prices are never trusted
- Idempotent webhook handler — duplicate webhook delivery cannot double-decrement inventory or double-send email
- `email_sent` flag prevents duplicate order confirmation emails across COD and webhook paths

### Shipping (Shiprocket)
- Automatic order push to Shiprocket on payment confirmation
- Manual re-push from admin panel (for retries or pre-integration orders)
- Shiprocket webhook handler updates order status, AWB code, courier, and tracking number in real-time
- Customer-facing shipment event timeline via `shipping_events` table
- Token cached in-memory for 24 hours (tokens valid 10 days, refreshed early for safety)
- Graceful degradation — Shiprocket failure does not block order creation

### Account
- Supabase Auth (email/password)
- Order history with tracking
- Saved addresses
- Persistent in-app notifications

### Admin Panel (`/admin`)
- Login with Supabase Auth + `ADMIN_EMAIL` guard
- Dashboard with revenue, order, and customer stats
- **Orders** — status updates, tracking number, courier, notes, manual Shiprocket push
- **Products** — create, edit, toggle active/featured, bulk actions; direct browser-to-Supabase image upload (up to 7 images, no size limit)
- **Categories** — create and manage with dedicated category image upload
- **Coupons** — percent / flat discounts, expiry, max uses
- **Inventory** — per-variant stock management
- **Customers** — full customer list
- **Reviews** — moderation (approve / reject)
- **Exchanges** — exchange request management
- **Content** — hero slides with image upload, announcement bar messages; changes take effect site-wide immediately
- **Audit Log** — every admin action written to `admin_audit_logs` with IP, user-agent, and request ID

---

## Storage Buckets

Three public Supabase Storage buckets are required:

| Bucket | Used For | Upload Method |
|---|---|---|
| `product-images` | Product gallery images | Direct browser upload (authenticated admin) |
| `hero-images` | Homepage hero slideshow | Server-side via API route (service role) |
| `category-images` | Category card images | Server-side via API route (service role) |

**`product-images` RLS policy** (INSERT, authenticated role):
```sql
bucket_id = 'product-images' AND auth.uid() = '<your-admin-user-uuid>'
```
This allows the admin's browser to upload directly to Supabase Storage, bypassing Vercel's 4MB request body limit entirely. `hero-images` and `category-images` use the service role key server-side and require no INSERT policy.

---

## Security

| Control | Implementation |
|---|---|
| Content Security Policy | Nonce-based, per-request, generated in Edge middleware — no `unsafe-eval` in production |
| Request tracing | Every request carries a unique `x-request-id` threaded through middleware → Sentry → audit log |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| Payment signature verification | HMAC-SHA256 on every Razorpay webhook and verify call |
| Server-side price validation | All prices re-fetched from DB at order creation — client prices ignored |
| Rate limiting | Upstash Redis (10 payment attempts / 10 min / IP; 20 coupon validations / 5 min / IP) |
| Admin authentication | Supabase session cookie + `ADMIN_EMAIL` env check on every admin API call |
| Admin audit log | Every login, logout, product edit, order update written to `admin_audit_logs` |
| Row Level Security | All Supabase tables have RLS enabled |
| Service role key | Server-side only — never referenced in any client component |
| Shiprocket webhook | Token-in-URL guard (`?token=SHIPROCKET_WEBHOOK_TOKEN`) |
| `X-Powered-By` header | Removed in middleware |

---

## Project Structure

```
rareease/
├── src/
│   ├── middleware.ts                  # Edge middleware: nonce CSP, x-request-id, Redis rate limit warning
│   ├── app/
│   │   ├── layout.tsx                 # Root layout — async, reads nonce from middleware
│   │   ├── page.tsx                   # Homepage server component
│   │   ├── HomeClient.tsx             # Homepage client component
│   │   ├── sitemap.ts                 # Dynamic sitemap (revalidates hourly)
│   │   ├── opengraph-image.tsx        # Dynamic OG image
│   │   ├── not-found.tsx              # Branded 404
│   │   ├── error.tsx / global-error.tsx
│   │   ├── admin/                     # /admin route (protected)
│   │   ├── products/[slug]/           # Product detail page + JSON-LD
│   │   └── api/
│   │       ├── health/                # GET — edge runtime, for uptime monitors
│   │       ├── payments/
│   │       │   ├── create/            # POST — validate, price-check, create Razorpay order
│   │       │   ├── verify/            # POST — verify signature, return UI status only
│   │       │   └── webhook/           # POST — authoritative post-payment handler
│   │       ├── orders/
│   │       │   ├── track/             # GET — order status for tracking overlay
│   │       │   └── cancel/            # POST — cancel pending order
│   │       ├── coupons/validate/      # POST — server-side coupon validation
│   │       ├── shiprocket/webhook/    # POST — Shiprocket shipment status updates
│   │       └── admin/                 # All protected by requireAdmin()
│   │           ├── auth/              # POST login / DELETE logout (+ audit log)
│   │           ├── orders/            # GET / PATCH (+ audit log)
│   │           ├── products/          # GET / POST / PATCH / DELETE (+ audit log)
│   │           ├── categories/        # GET / POST / PATCH / DELETE
│   │           ├── category-image/    # POST — category image upload (service role)
│   │           ├── hero-image/        # POST — hero slide image upload (service role)
│   │           ├── coupons/           # GET / POST / PATCH / DELETE
│   │           ├── customers/         # GET
│   │           ├── reviews/           # GET / PATCH
│   │           ├── exchanges/         # GET / PATCH
│   │           ├── stats/             # GET — dashboard metrics
│   │           ├── content/           # GET / POST — hero slides + announcements
│   │           ├── shiprocket/push/   # POST — manual Shiprocket order push
│   │           └── me/                # GET — current admin user info
│   ├── components/
│   │   ├── Hero.tsx · Navbar.tsx · CartDrawer.tsx · CheckoutOverlay.tsx
│   │   ├── ProductOverlay.tsx · SearchOverlay.tsx · AccountPanel.tsx
│   │   ├── WishlistPanel.tsx · CategoryOverlay.tsx · FullCollectionOverlay.tsx
│   │   ├── OrderTrackingOverlay.tsx · NotificationPanel.tsx · MobileNav.tsx
│   │   ├── AnnouncementBar.tsx · RecentlyViewed.tsx · StaticPageOverlay.tsx
│   │   ├── admin/
│   │   │   ├── AdminShell.tsx         # Layout + nav shell
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminOrders.tsx        # + Shiprocket push button
│   │   │   ├── AdminProducts.tsx      # Direct browser-to-Storage image upload
│   │   │   ├── AdminCategories.tsx    # + category image upload
│   │   │   ├── AdminContent.tsx       # Hero slides + announcements
│   │   │   ├── AdminCoupons.tsx
│   │   │   ├── AdminCustomers.tsx
│   │   │   ├── AdminInventory.tsx
│   │   │   ├── AdminReviews.tsx
│   │   │   └── AdminExchanges.tsx
│   │   └── ui/                        # Button, Input, Badge
│   ├── lib/
│   │   ├── db.ts                      # Full Supabase data layer
│   │   ├── razorpay.ts                # Razorpay client + HMAC helpers
│   │   ├── shiprocket.ts              # Shiprocket API client (token cache, order push)
│   │   ├── storage.ts                 # Supabase Storage helpers (product images)
│   │   ├── email.ts                   # Resend transactional email
│   │   ├── rateLimit.ts               # Upstash Redis rate limiter (in-memory fallback)
│   │   ├── monitoring.ts              # Sentry wrapper + setRequestContext()
│   │   ├── auditLog.ts                # Admin audit logger (fire-and-forget)
│   │   ├── adminAuth.ts               # requireAdmin() middleware helper
│   │   ├── productImage.ts            # Product image resolution (DB media → legacy fallback)
│   │   ├── supabase.ts                # Browser Supabase client
│   │   ├── supabaseServer.ts          # Server Supabase client (cookies)
│   │   └── supabaseAdmin.ts           # Service role client (server-only)
│   ├── store/
│   │   ├── cartStore.ts · wishlistStore.ts · uiStore.ts
│   │   ├── adminStore.ts · productsStore.ts
│   ├── types/index.ts
│   └── styles/
│       ├── globals.css · responsive.css · admin.css
├── tests/
│   ├── payments.test.ts               # Unit tests for payment logic
│   └── e2e/
│       ├── checkout.spec.ts · cart.spec.ts · accessibility.spec.ts
├── public/
│   ├── robots.txt                     # Blocks /admin and /api from indexing
│   ├── manifest.json                  # PWA manifest
│   └── .well-known/security.txt
├── rareease-schema.sql                # Run first
├── rareease-additions.sql             # Run second
├── rareease-migrations.sql            # Run third
├── rareease-audit-migration.sql       # Run fourth
├── next.config.js
├── vercel.json                        # Region bom1, function timeouts
├── .lighthouserc.json                 # CI gates: perf ≥0.8, a11y/seo/best-practices ≥0.9
└── .github/workflows/ci.yml
```

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/rareease.git
cd rareease
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx

# Shiprocket
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=xxxx
SHIPROCKET_PICKUP_LOCATION=Primary         # as named in your Shiprocket dashboard
SHIPROCKET_WEBHOOK_TOKEN=xxxx              # any random secret string

# Admin
ADMIN_EMAIL=admin@rareease.com             # must match a Supabase auth user

# Email
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=orders@rareease.com      # must be on a verified Resend domain

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX   # country code + number, no +

# Optional (app degrades gracefully without these)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxxx
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### 3. Set up Supabase Storage buckets

In the Supabase Dashboard → Storage, create three **public** buckets:

- `product-images`
- `hero-images`
- `category-images`

Then add an INSERT policy to `product-images` (Storage → Policies → product-images → New Policy → Full customization):

| Field | Value |
|---|---|
| Policy name | `admin upload product images` |
| Allowed operation | INSERT |
| Target roles | authenticated |
| Policy definition | `bucket_id = 'product-images' AND auth.uid() = '<your-admin-uuid>'` |

Get your admin UUID from Supabase → Authentication → Users.

### 4. Run database migrations

In the Supabase SQL editor, paste and run each file in order:

```
1. rareease-schema.sql
2. rareease-additions.sql
3. rareease-migrations.sql
4. rareease-audit-migration.sql
```

### 5. Configure Shiprocket webhook

In your Shiprocket Dashboard → Settings → API → Webhooks, set the webhook URL to:

```
https://yourdomain.com/api/shiprocket/webhook?token=<SHIPROCKET_WEBHOOK_TOKEN>
```

### 6. Start

```bash
npm run dev        # http://localhost:3000
```

Admin panel: `http://localhost:3000/admin`

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server locally
npm run lint         # ESLint
npm test             # Unit tests (payments.test.ts)
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI
```

---

## Payment Flow

```
POST /api/payments/create
  ├── Rate limit (Upstash Redis)
  ├── Re-fetch authoritative prices from DB
  ├── Inventory availability check
  ├── COD fraud guards (₹2,000 limit, pending order block, cancel history)
  ├── Coupon validation
  ├── Create Razorpay order (online) or confirm (COD)
  └── COD: decrement inventory → send email (email_sent=true) → push to Shiprocket

Razorpay modal (client-side, online only)

POST /api/payments/verify   ← UI status only, no side effects
  ├── Verify HMAC signature
  └── Return current DB status to client

POST /api/payments/webhook  ← Razorpay server-to-server
  ├── Verify webhook signature
  ├── Guard: skip if payment_method = cod
  ├── Idempotency: skip if already paid
  ├── Mark order paid, decrement inventory, increment coupon usage
  ├── Send confirmation email (email_sent=true)
  └── Push order to Shiprocket
```

## Shipping Flow

```
Order confirmed (COD or webhook)
  └── createShiprocketOrder()
        ├── Fetch Shiprocket token (cached 24h)
        ├── POST /v1/external/orders/create/adhoc
        └── On success: store shiprocket_order_id in orders table

POST /api/shiprocket/webhook?token=<secret>
  ├── Verify token
  ├── Update orders.status, awb_code, courier, tracking_number
  └── Insert row into shipping_events (customer-facing timeline)

Admin: POST /api/admin/shiprocket/push
  └── Manual re-push for any order (retry or legacy orders)
```

---

## Environment Variables Reference

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only — never expose to client |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Client-side |
| `RAZORPAY_KEY_ID` | Yes | Server-side |
| `RAZORPAY_KEY_SECRET` | Yes | |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | |
| `SHIPROCKET_EMAIL` | Yes | Registered Shiprocket account email |
| `SHIPROCKET_PASSWORD` | Yes | |
| `SHIPROCKET_PICKUP_LOCATION` | Yes | As named in Shiprocket dashboard |
| `SHIPROCKET_WEBHOOK_TOKEN` | Yes | Any secret string — included in webhook URL |
| `ADMIN_EMAIL` | Yes | Must match a Supabase auth user |
| `RESEND_API_KEY` | Yes | |
| `RESEND_FROM_EMAIL` | Yes | Must be on a verified Resend domain |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical URL |
| `NEXT_PUBLIC_APP_ENV` | Yes | `production` / `staging` / `development` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes | Country code + number, no `+` |
| `UPSTASH_REDIS_REST_URL` | Recommended | Falls back to in-memory if absent |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Falls back to in-memory if absent |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Falls back to console.error if absent |
| `SENTRY_ORG` | CI only | |
| `SENTRY_PROJECT` | CI only | |
| `SENTRY_AUTH_TOKEN` | CI only | For source map uploads |

---

## CI/CD

```
push to main or PR
  ↓
TypeScript check (tsc --noEmit)
  ↓
Unit tests
  ↓
Deploy to Vercel
  ├── PR → preview URL (auto-commented on PR)
  └── main → production
  ↓
E2E tests (Playwright against preview URL)
  ↓
Lighthouse CI
  ├── Performance ≥ 0.8  [error]
  ├── Accessibility ≥ 0.9 [error]
  ├── Best practices ≥ 0.9 [error]
  └── SEO ≥ 0.9 [error]
```

Required GitHub Actions secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

---

## Test Payment Credentials

```
Card:   4111 1111 1111 1111
Expiry: Any future date
CVV:    Any 3 digits
OTP:    1234
```

---

## Smoke Test Checklist

Run after every production deploy:

- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] `/sitemap.xml` → valid XML with product URLs
- [ ] Homepage loads without console errors
- [ ] `/admin` login works with admin credentials
- [ ] COD order → confirmation email arrives
- [ ] COD order → Shiprocket order created (check Shiprocket dashboard)
- [ ] Online payment → order marked `payment_status: paid`
- [ ] Razorpay Webhooks → delivery log shows `200 OK`
- [ ] Shiprocket webhook → order status updates correctly
- [ ] `admin_audit_logs` has entries after admin login
- [ ] Sentry receives a test error (visit `/this-does-not-exist`)
- [ ] Product image upload in admin → image visible immediately in admin panel
- [ ] Hero slide image upload in admin → image visible in admin panel and on storefront

---

## Database Migrations

Run in order in the Supabase SQL editor:

| File | Contents |
|---|---|
| `rareease-schema.sql` | Core tables, RLS policies, stored functions |
| `rareease-additions.sql` | `product_media`, `user_notifications`, `addresses` |
| `rareease-migrations.sql` | Incremental column additions |
| `rareease-audit-migration.sql` | `admin_audit_logs` table + `orders.email_sent` column |

---

## Design Tokens

```css
--black:    #000000   /* Primary background */
--white:    #F9F9F7   /* Primary text */
--sage:     #C3CE94   /* Accent / CTA */
--blush:    #FEBDA6   /* Wishlist / alerts */
--warm:     #D9D2C5   /* Neutral warm */
--gray:     #1a1a1a   /* Card backgrounds */
--mid-gray: #888888   /* Secondary text */
```

Fonts: **Bebas Neue** (display) · **Montserrat** (body) · **Cormorant Garamond** (editorial). All loaded via `next/font/google` — no render-blocking `@import`.

---

## License

Private — All rights reserved. © 2026 Rare Ease.

---

<div align="center">
  <i>Built with precision. Worn with ease.</i>
</div>