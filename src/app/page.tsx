// Server component — enables generateMetadata + removes 'use client' from root
import type { Metadata } from 'next';
import HomeClient from './HomeClient';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com').replace(/\/$/, '');

export const metadata: Metadata = {
  alternates: { canonical: APP_URL },
};

export default function Home() {
  return <HomeClient />;
}
