import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseAdmin';
import CollectionPageClient from './CollectionPageClient';

// Pages revalidate every 60 s via ISR
export const revalidate = 60;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com').replace(/\/$/, '');

interface Props { params: Promise<{ slug: string }> }

// Return empty array on any failure — pages are served via ISR at runtime.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('categories')
      .select('slug')
      .eq('is_active', true);
    return (data ?? []).map(c => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = createAdminClient();
    const { data: cat } = await supabase
      .from('categories').select('*').eq('slug', slug).single();
    if (!cat) return { title: 'Collection Not Found' };

    const description = cat.description ?? `Shop the ${cat.name} collection at Rare Ease — premium Indian streetwear.`;
    const canonicalUrl = `${APP_URL}/collections/${slug}`;

    return {
      title: cat.name,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: 'website',
        url: canonicalUrl,
        title: `${cat.name} — Rare Ease`,
        description,
        siteName: 'Rare Ease',
        images: cat.image_url
          ? [{ url: cat.image_url, width: 1200, height: 630, alt: cat.name }]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${cat.name} — Rare Ease`,
        description,
        images: cat.image_url ? [cat.image_url] : undefined,
      },
    };
  } catch {
    return { title: 'Collection — Rare Ease' };
  }
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  try {
    const supabase = createAdminClient();

    const { data: category } = await supabase
      .from('categories').select('*').eq('slug', slug).single();
    if (!category) notFound();

    const { data: products } = await supabase
      .from('products')
      .select(`*, media:product_media(*), variants(*, inventory(*))`)
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('collection_sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    return <CollectionPageClient category={category} products={products ?? []} />;
  } catch {
    notFound();
  }
}