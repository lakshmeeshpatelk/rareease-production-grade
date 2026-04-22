/**
 * scripts/seed-products.ts
 *
 * Seeds all 150 products (6 categories × 25) into Supabase.
 * Run once after applying rareease-schema.sql + rareease-migrations.sql.
 *
 * Usage:
 *   npx tsx scripts/seed-products.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { MOCK_PRODUCTS } from '../src/lib/mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function seed() {
  console.log(`🌱  Seeding ${MOCK_PRODUCTS.length} products…`);

  for (const product of MOCK_PRODUCTS) {
    // 1. Upsert product row
    const { error: pErr } = await supabase.from('products').upsert({
      id:             product.id,
      category_id:    product.category_id,
      name:           product.name,
      slug:           product.slug,
      tagline:        product.tagline ?? null,
      description:    product.description ?? null,
      price:          product.price,
      original_price: product.original_price ?? null,
      badge:          product.badge ?? null,
      is_featured:    product.is_featured,
      is_active:      product.is_active,
    }, { onConflict: 'id' });

    if (pErr) { console.error(`  ✗ product ${product.id}:`, pErr.message); continue; }

    // 2. Upsert each variant
    for (const v of product.variants ?? []) {
      const { error: vErr } = await supabase.from('variants').upsert({
        id:         v.id,
        product_id: v.product_id,
        size:       v.size,
        sku:        v.sku,
      }, { onConflict: 'id' });
      if (vErr) console.warn(`    ✗ variant ${v.id}:`, vErr.message);
    }

    // 3. Upsert each inventory row
    for (const inv of product.inventory ?? []) {
      const { error: iErr } = await supabase.from('inventory').upsert({
        variant_id: inv.variant_id,
        quantity:   inv.quantity,
        reserved:   inv.reserved,
      }, { onConflict: 'variant_id' });
      if (iErr) console.warn(`    ✗ inventory ${inv.variant_id}:`, iErr.message);
    }

    console.log(`  ✓ ${product.id}  ${product.name}`);
  }

  console.log('\n✅  Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
