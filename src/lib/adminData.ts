import { CATEGORIES } from './categories';

export interface AdminOrder {
  id: string; customer: string; email: string; phone: string; city: string;
  items: { name: string; size: string; qty: number; price: number }[];
  subtotal: number; total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: 'COD' | 'Online';
  createdAt: string; address: string;
  trackingNumber?: string; courier?: string; notes?: string;
}
export interface AdminReview {
  id: string; productId: string; productName: string; customer: string;
  rating: number; body: string; approved: boolean; verified: boolean; createdAt: string;
}
export interface HeroSlide { id: number; src: string; label: string; sub: string; ctaText?: string; ctaLink?: string; active: boolean; }
export interface AnnouncementMsg { id: number; text: string; active: boolean; }

export interface ExchangeRequest {
  id: string; orderId: string; customer: string; email: string; phone: string;
  type: 'exchange' | 'cancellation';
  reason: 'damage' | 'wrong_item' | 'size' | 'cancel_before_production' | 'other';
  reasonLabel: string;
  items: { name: string; size: string; qty: number; price: number }[];
  wantSize?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  deliveredAt?: string; requestedAt: string;
  withinWindow: boolean; shippingBy: 'rareease' | 'customer';
  adminNote?: string; proofNote?: string;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { id:1, src:'/hero/slide-1.svg', label:'Drift Culture',   sub:"Women's Combo Set",            ctaText:'Shop Now', ctaLink:'#shop', active:true  },
  { id:2, src:'/hero/slide-2.svg', label:'Never Stop',      sub:"Women's Oversized Tee — Back", ctaText:'Shop Now', ctaLink:'#shop', active:true  },
  { id:3, src:'/hero/slide-3.svg', label:'Street Core',     sub:"Women's Combo — Side",         ctaText:'Shop Now', ctaLink:'#shop', active:true  },
  { id:4, src:'/hero/slide-4.svg', label:'Graphic Archive', sub:"Women's Oversized Tee",        ctaText:'Shop Now', ctaLink:'#shop', active:true  },
  { id:5, src:'/hero/slide-5.svg', label:'Surf California', sub:"Men's Oversized Tee",          ctaText:'Shop Now', ctaLink:'#shop', active:true  },
  // id:6 (Heartbeat / slide-6.svg) omitted — file does not exist yet.
  // Add public/hero/slide-6.svg then restore this entry.
];

export const DEFAULT_ANNOUNCEMENTS: AnnouncementMsg[] = [
  { id:1, text:'✦ Free shipping pan India on all orders ✦',       active:true  },
  { id:2, text:'✦ SS25 Drop is live — limited stock ✦',           active:true  },
  { id:3, text:'✦ New drops every Friday · @rareeaseofficial ✦',  active:true  },
];

export { CATEGORIES };

export interface HeroTextConfig { eyebrow: string; headline: string; ctaPrimary: string; ctaSecondary: string; }
export const DEFAULT_HERO_TEXT: HeroTextConfig = { eyebrow:'SS25 · Now Live', headline:'WEAR THE RARE.', ctaPrimary:'Shop Now', ctaSecondary:'All Drops' };
