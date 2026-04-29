import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { trackShiprocketShipment } from '@/lib/shiprocket';
import { isRateLimited, getIP, LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/orders/track?id=RE123456
 *
 * Returns order details + live Shiprocket tracking if an AWB code is present.
 * Uses service-role key (bypasses RLS) — order ID acts as shared secret.
 */
export async function GET(req: NextRequest) {
  // Rate limiting — reuse the general limit (60 per min per IP)
  const ip = getIP(req);
  if (await isRateLimited(`orders:track:${ip}`, LIMITS.general)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  const id = req.nextUrl.searchParams.get('id')?.trim().toUpperCase();
  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items (
        id, order_id, product_id, variant_id, quantity, price,
        product:products ( id, name, slug ),
        variant:variants ( id, size )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Enrich with live Shiprocket tracking if AWB is available
  let liveTracking: unknown = null;
  const awb = data.awb_code as string | null;
  if (awb) {
    try {
      const srTracking = await trackShiprocketShipment(awb);
      liveTracking = srTracking.tracking_data ?? null;
    } catch {
      // Non-fatal: return order data without live tracking
    }
  }

  return NextResponse.json({ ...data, liveTracking });
}
