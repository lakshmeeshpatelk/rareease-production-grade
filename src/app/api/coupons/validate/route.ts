import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { isRateLimited, getIP, LIMITS } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (await isRateLimited(`coupons:${ip}`, LIMITS.coupons)) {
    return NextResponse.json({ valid: false, error: 'Too many attempts. Please wait.' }, { status: 429 });
  }

  const { code, subtotal } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', (code as string).trim().toUpperCase())
    .single();

  if (error || !data) return NextResponse.json({ valid: false, error: 'Coupon not found' });

  const coupon = data as {
    id: string; code: string; type: 'percent' | 'flat'; value: number;
    min_order: number; max_uses: number; used_count: number; active: boolean; expires_at: string | null;
  };

  if (!coupon.active)                                    return NextResponse.json({ valid: false, error: 'Coupon is inactive' });
  if (coupon.used_count >= coupon.max_uses)              return NextResponse.json({ valid: false, error: 'Coupon has reached its usage limit' });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'Coupon has expired' });
  if (subtotal < coupon.min_order)                      return NextResponse.json({ valid: false, error: `Minimum order ₹${coupon.min_order} required` });

  return NextResponse.json({ valid: true, coupon });
}
