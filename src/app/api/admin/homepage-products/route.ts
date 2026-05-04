import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { logAdminAction } from '@/lib/auditLog';

// ── GET: fetch all products with homepage/collection sort data ──────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const { data, error } = await createAdminClient()
    .from('products')
    .select('id, name, slug, category_id, price, badge, is_active, is_featured, homepage_featured, homepage_sort_order, collection_sort_order, product_media(url, position, type)')
    .order('collection_sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST: bulk update homepage_featured + sort orders ───────────────────────
// Body: {
//   homepageIds: string[],          // all products to show on homepage (max 60), in order
//   collectionOrder: string[],      // all active product IDs in desired collection order
// }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const body = await req.json();
  const { homepageIds, collectionOrder } = body as {
    homepageIds?: string[];
    collectionOrder?: string[];
  };

  const admin = createAdminClient();
  const errors: string[] = [];

  // ── Update homepage featured + homepage_sort_order ──────────────────────
  if (Array.isArray(homepageIds)) {
    if (homepageIds.length > 60) {
      return NextResponse.json({ error: 'Maximum 60 products allowed on homepage.' }, { status: 400 });
    }

    // 1. Clear all homepage_featured flags first
    const { error: clearErr } = await admin
      .from('products')
      .update({ homepage_featured: false, homepage_sort_order: 9999 })
      .neq('id', '__never__'); // update all rows

    if (clearErr) errors.push(`Clear homepage: ${clearErr.message}`);

    // 2. Set new homepage products with their sort order
    for (let i = 0; i < homepageIds.length; i++) {
      const { error } = await admin
        .from('products')
        .update({ homepage_featured: true, homepage_sort_order: (i + 1) * 10 })
        .eq('id', homepageIds[i]);
      if (error) errors.push(`Set homepage ${homepageIds[i]}: ${error.message}`);
    }

    logAdminAction('homepage.update', {
      meta: { count: homepageIds.length },
      req,
    });
  }

  // ── Update collection_sort_order ─────────────────────────────────────────
  if (Array.isArray(collectionOrder)) {
    for (let i = 0; i < collectionOrder.length; i++) {
      const { error } = await admin
        .from('products')
        .update({ collection_sort_order: (i + 1) * 10 })
        .eq('id', collectionOrder[i]);
      if (error) errors.push(`Set collection ${collectionOrder[i]}: ${error.message}`);
    }

    logAdminAction('collection.reorder', {
      meta: { count: collectionOrder.length },
      req,
    });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), partial: true }, { status: 207 });
  }

  return NextResponse.json({ ok: true });
}