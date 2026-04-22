import { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/categories';

export const revalidate = 3600; // re-generate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com').replace(/\/$/, '');
  const now  = new Date();

  // Fetch live products from Supabase.
  // If Supabase is unreachable at build time the sitemap will be generated
  // with no product URLs — better than shipping stale mock slugs to production.
  let activeProducts: { slug: string; updated_at?: string }[] = [];
  try {
    const { createAdminClient } = await import('@/lib/supabaseAdmin');
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true);
    if (error) throw error;
    activeProducts = data ?? [];
  } catch (err) {
    console.error('[sitemap] Failed to fetch products from Supabase — product URLs omitted:', err);
    // Return sitemap without product URLs rather than including mock/stale slugs.
    activeProducts = [];
  }

  const productUrls: MetadataRoute.Sitemap = activeProducts.map(p => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionUrls: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${base}/collections/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    { url: base,             lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${base}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...collectionUrls,
    ...productUrls,
  ];
}
