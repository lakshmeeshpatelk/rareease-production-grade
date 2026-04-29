import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { uploadProductImages, deleteProductImages } from '@/lib/storage';
import { logAdminAction } from '@/lib/auditLog';


export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { data, error } = await createAdminClient()
    .from('products')
    .select('*, variants(id, product_id, size, sku, inventory(id, variant_id, quantity, reserved)), product_media(id, product_id, url, type, position, alt_text)')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { product, variants, inventory, media } = await req.json();
  const admin = createAdminClient();

  const { error: pErr } = await admin.from('products').upsert(product, { onConflict: 'id' });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  for (const v of (variants ?? [])) await admin.from('variants').upsert(v, { onConflict: 'id' });
  for (const inv of (inventory ?? [])) {
    const { id: _id, ...invData } = inv as Record<string, unknown>;
    await admin.from('inventory').upsert(invData, { onConflict: 'variant_id' });
  }

  // Upload images to Supabase Storage (converts base64 → permanent URLs)
  if (Array.isArray(media) && media.length > 0) {
    let permanentUrls: string[];
    try {
      permanentUrls = await uploadProductImages(media, product.id);
    } catch (e) {
      return NextResponse.json({ error: `Image upload failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }
    // Reject any base64 fallbacks — means Supabase Storage upload failed
    const badUrl = permanentUrls.find(u => u.startsWith('data:'));
    if (badUrl) {
      return NextResponse.json({ error: 'Image upload failed: could not save to Supabase Storage. Check that the product-images bucket exists and has the correct policies.' }, { status: 500 });
    }
    await admin.from('product_media').delete().eq('product_id', product.id);
    const { error: mErr } = await admin.from('product_media').insert(
      permanentUrls.map((url, i) => ({ product_id: product.id, url, type: 'image', position: i }))
    );
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id, variantId, quantity, media, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const admin = createAdminClient();

  // Inventory update — upsert so it works even when the row doesn't exist yet
  if (variantId !== undefined && quantity !== undefined) {
    const { error } = await admin
      .from('inventory')
      .upsert({ variant_id: variantId, quantity, reserved: 0 }, { onConflict: 'variant_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Media update — upload base64 → Storage, save URLs
  if (Array.isArray(media)) {
    let permanentUrls: string[];
    try {
      permanentUrls = await uploadProductImages(media, id);
    } catch (e) {
      return NextResponse.json({ error: `Image upload failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }
    const badUrl = permanentUrls.find(u => u.startsWith('data:'));
    if (badUrl) {
      return NextResponse.json({ error: 'Image upload failed: could not save to Supabase Storage. Check that the product-images bucket exists and has the correct policies.' }, { status: 500 });
    }
    await admin.from('product_media').delete().eq('product_id', id);
    if (permanentUrls.length > 0) {
      const { error: mErr } = await admin.from('product_media').insert(
        permanentUrls.map((url, i) => ({ product_id: id, url, type: 'image', position: i }))
      );
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    }
    if (Object.keys(fields).length === 0) return NextResponse.json({ ok: true });
  }

  // Product field update
  const update: Record<string, unknown> = {};
  for (const key of ['is_active','is_featured','price','original_price','badge','name','tagline','description','category_id'] as const) {
    if ((fields as Record<string, unknown>)[key] !== undefined) update[key] = (fields as Record<string, unknown>)[key];
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const { error } = await admin.from('products').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  logAdminAction('product.update', { resourceId: `product:${id}`, meta: update, req });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req); if (auth) return auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  // Delete images from storage too
  await deleteProductImages(id).catch(console.error);
  const { error } = await createAdminClient().from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  logAdminAction('product.delete', { resourceId: `product:${id}`, req });
  return NextResponse.json({ ok: true });
}