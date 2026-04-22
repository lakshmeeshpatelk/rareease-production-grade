import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseAdmin';
import ProductPageClient from './ProductPageClient';

// Pages revalidate every 60 s via ISR — no full rebuild needed for new products
export const revalidate = 60;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com').replace(/\/$/, '');

interface Props { params: Promise<{ slug: string }> }

async function getProduct(slug: string) {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('products')
      .select(`*, category:categories(*), media:product_media(*), variants(*, inventory(*))`)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

// Return empty array on any failure — pages are served via ISR at runtime.
// A crash here would abort the entire Vercel build.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true);
    return (data ?? []).map(p => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product Not Found' };

  const description = product.description ?? product.tagline ?? `Shop ${product.name} at Rare Ease — premium Indian streetwear.`;

  // Resolve primary image: DB media → null
  const sortedMedia = (product.media ?? []).sort((a: any, b: any) => a.position - b.position);
  const primaryImage = sortedMedia[0]?.url ?? null;

  const ogImages = primaryImage
    ? [{ url: primaryImage, width: 1200, height: 1200, alt: product.name }]
    : undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: `${APP_URL}/products/${slug}` },
    openGraph: {
      type: 'website',
      url: `${APP_URL}/products/${slug}`,
      title: `${product.name} — Rare Ease`,
      description,
      images: ogImages,
      siteName: 'Rare Ease',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — Rare Ease`,
      description,
      images: ogImages ? [ogImages[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <ProductPageClient product={product} />;
}
