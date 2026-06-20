/**
 * storage.ts — Supabase Storage helpers for product images.
 *
 * Bucket: "product-images"  (public, create in Supabase Dashboard → Storage)
 * Policy: Allow public SELECT, allow service-role INSERT/DELETE
 *
 * Images are stored at: product-images/{productId}/{timestamp}-{index}.{ext}
 * Public URL:           {SUPABASE_URL}/storage/v1/object/public/product-images/...
 */

import { createAdminClient } from '@/lib/supabaseAdmin';

const BUCKET = 'product-images';

/**
 * Upload a base64 data URL or a remote URL to Supabase Storage.
 * Returns the permanent public URL, or throws on failure.
 */
export async function uploadProductImage(
  dataUrlOrRemoteUrl: string,
  productId: string,
  index: number
): Promise<string> {
  // If it's already a Supabase Storage URL, return as-is (no re-upload needed)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (dataUrlOrRemoteUrl.startsWith(supabaseUrl)) {
    return dataUrlOrRemoteUrl;
  }

  // If it's a remote URL (not base64), return as-is — already hosted
  if (!dataUrlOrRemoteUrl.startsWith('data:')) {
    return dataUrlOrRemoteUrl;
  }

  // It's a base64 data URL — upload to Supabase Storage
  const admin = createAdminClient();

  // Parse the data URL: data:<mime>;base64,<data>
  const [header, base64Data] = dataUrlOrRemoteUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType  = mimeMatch?.[1] ?? 'image/jpeg';
  const ext       = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';

  // Convert base64 to Buffer
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = `${productId}/${Date.now()}-${index}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message} (status: ${(error as {statusCode?: string}).statusCode ?? 'unknown'}, bucket: ${BUCKET}, path: ${filePath})`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload all images for a product. Accepts an array of data URLs or existing URLs.
 * Returns an array of permanent public URLs in the same order.
 */
export async function uploadProductImages(
  images: string[],
  productId: string
): Promise<string[]> {
  const results = await Promise.allSettled(
    images.map((img, i) => uploadProductImage(img, productId, i))
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    // Throw so the API returns a proper 500 instead of saving base64 to the DB
    throw new Error(`Image ${i} upload failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
}

/**
 * Delete all images for a product from storage (called on product delete).
 */
export async function deleteProductImages(productId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from(BUCKET).list(productId);
  if (!files?.length) return;
  const paths = files.map(f => `${productId}/${f.name}`);
  await admin.storage.from(BUCKET).remove(paths);
}