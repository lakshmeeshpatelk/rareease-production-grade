/**
 * POST /api/coupons/validate
 * Validates a coupon code and returns the discount amount.
 * Does NOT increment usage — that happens only on confirmed order creation.
 *
 * Body: { code: string, subtotal: number }
 * Returns: { discount_amount: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit }             from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Rate limit coupon checks: 20 per 5 minutes per IP
  const limited = await checkRateLimit(`coupon:${ip}`, 20, 300);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { code?: string; subtotal?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { code, subtotal } = body;
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
  }
  if (typeof subtotal !== 'number' || subtotal <= 0) {
    return NextResponse.json({ error: 'Invalid subtotal' }, { status: 400 });
  }

  const supabase = createAdmin();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single();

  if (error || !coupon) {
    return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
  }
  if (coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 });
  }
  if (subtotal < (coupon.min_order ?? 0)) {
    return NextResponse.json(
      { error: `Minimum order value for this coupon is ₹${coupon.min_order}` },
      { status: 400 }
    );
  }

  let discountAmount = coupon.type === 'percent'
    ? Math.floor((subtotal * coupon.value) / 100)
    : coupon.value;
  discountAmount = Math.min(discountAmount, subtotal);

  return NextResponse.json({
    discount_amount: discountAmount,
    message: coupon.type === 'percent'
      ? `${coupon.value}% off applied — you save ₹${discountAmount}`
      : `₹${coupon.value} off applied`,
  });
}