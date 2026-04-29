import { Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'cat-1', slug: 'mens-oversized',    name: "Men's Oversized T-Shirt",    label: "Men's Oversized T-shirt",              description: 'Premium oversized tees for men.',     hero_badge: 'MOT', card_class: 'card-street',    pattern_class: 'card-pattern-1', created_at: '' },
  { id: 'cat-2', slug: 'womens-oversized',  name: "Women's Oversized T-Shirt",  label: "Women's Oversized T-shirt",            description: 'Premium oversized tees for women.',   hero_badge: 'WOT', card_class: 'card-women',     pattern_class: 'card-pattern-2', created_at: '' },
  { id: 'cat-3', slug: 'mens-sleeveless',   name: "Men's Sleeveless T-Shirt",   label: "Men's Sleeveless T-shirt",              description: 'Sleeveless tees for men.',             hero_badge: 'MSL', card_class: 'card-drift',     pattern_class: 'card-pattern-3', created_at: '' },
  { id: 'cat-4', slug: 'womens-sleeveless', name: "Women's Sleeveless T-Shirt", label: "Women's Sleeveless T-shirt",            description: 'Sleeveless tees for women.',           hero_badge: 'WSL', card_class: 'card-archive',   pattern_class: 'card-pattern-4', created_at: '' },
  { id: 'cat-5', slug: 'mens-combo',        name: "Men's Combo",                label: "Men's · Combo",                         description: 'Matching sets for men.',             hero_badge: 'MC',  card_class: 'card-minimal',   pattern_class: 'card-pattern-1', created_at: '' },
  { id: 'cat-6', slug: 'womens-combo',      name: "Women's Combo",              label: "Women's · Combo",          description: 'Matching sets for women.',          hero_badge: 'WC',  card_class: 'card-oversized', pattern_class: 'card-pattern-2', created_at: '' },
];
