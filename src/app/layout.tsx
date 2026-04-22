import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Montserrat, Cormorant_Garamond } from 'next/font/google';
import { headers } from 'next/headers';
import '@/styles/globals.css';

/* ── Fonts (optimised via next/font — no render-blocking @import needed) ── */
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

const montserrat = Montserrat({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  preload: false, // secondary font — skip preload to save a round-trip
});

/* ── Constants ── */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com').replace(/\/$/, '');

/* ── Viewport ── */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale / userScalable intentionally NOT set — disabling pinch-to-zoom
  // violates WCAG 2.1 SC 1.4.4 (Resize Text, Level AA) and harms users with
  // low vision. iOS/Android respect this and will not over-zoom on input focus
  // as long as font-size on inputs is >= 16px (enforced in globals.css).
  themeColor: '#000000',
};

/* ── Root Metadata ── */
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Rare Ease — Wear The Rare. Feel The Ease.',
    template: '%s — Rare Ease',
  },
  description:
    'Premium Indian streetwear crafted for those who move between worlds. Shop exclusive drops, limited editions, and signature collections. Free delivery across India.',
  keywords: [
    'streetwear India',
    'Indian streetwear brand',
    'premium streetwear',
    'luxury street fashion India',
    'rare ease',
    'limited edition clothing India',
    'streetwear Mumbai Delhi Bangalore',
    'D2C fashion India',
    'premium casual wear',
  ],
  authors: [{ name: 'Rare Ease', url: APP_URL }],
  creator: 'Rare Ease',
  publisher: 'Rare Ease',
  alternates: { canonical: APP_URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'Rare Ease',
    title: 'Rare Ease — Wear The Rare. Feel The Ease.',
    description:
      'Premium Indian streetwear crafted for those who move between worlds. Shop exclusive drops and limited editions.',
    // OG image served from /opengraph-image via Next.js file convention
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rareease',
    creator: '@rareease',
    title: 'Rare Ease',
    description: 'Wear The Rare. Feel The Ease. Premium Indian streetwear.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

/* ── Organisation + WebSite JSON-LD (global schema) ── */
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'Rare Ease',
      url: APP_URL,
      logo: { '@type': 'ImageObject', url: `${APP_URL}/logo.svg` },
      sameAs: [
        'https://www.instagram.com/rareease',
        'https://www.facebook.com/rareease',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English', 'Hindi'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'Rare Ease',
      publisher: { '@id': `${APP_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

/* ── Root Layout ── */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the per-request nonce injected by src/middleware.ts.
  // This nonce is also present in the Content-Security-Policy header, allowing
  // our inline scripts to execute without needing 'unsafe-inline' in CSP Level 3.
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${montserrat.variable} ${cormorantGaramond.variable}`}
    >
      <head>
        {/* Preconnect to critical third-party origins — eliminates DNS + TLS latency */}
        {/* Note: fonts.googleapis.com preconnect is injected automatically by next/font */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://sdk.cashfree.com" />
        <link rel="dns-prefetch" href="https://api.cashfree.com" />
        {/* sandbox.cashfree.com dns-prefetch intentionally omitted — only needed in dev/staging */}

        {/* Global structured data — Organization + WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
          nonce={nonce}
        />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-to-main">Skip to main content</a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}