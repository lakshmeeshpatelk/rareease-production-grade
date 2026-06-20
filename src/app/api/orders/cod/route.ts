/**
 * POST /api/orders/cod
 *
 * Cash on Delivery order placement.
 *
 * Fraud guards:
 *  - Order total ≤ ₹2,000
 *  - Phone must have no currently-pending COD orders
 *  - Phone must have < 3 cancelled COD orders in last 30 days
 *
 * On success:
 *  1. Create order (payment_status = 'pending', status = 'processing')
 *  2. Decrement inventory
 *  3. Increment coupon usage
 *  4. Send confirmation email
 *  5. Push to Shiprocket
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin }    from '@/lib/supabaseAdmin';
import { generateOrderId }               from '@/lib/orderUtils';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';
import { createShiprocketOrder }         from '@/lib/shiprocket';
import { checkRateLimit }               from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const limited = await checkRateLimit(`cod:${ip}`, 5, 600);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { items, address, coupon_code } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }
  if (!address?.name || !address?.phone || !address?.line1) {
    return NextResponse.json({ error: 'Incomplete address' }, { status: 400 });
  }

  const supabase = createAdmin();

  // ── Re-verify prices and inventory (same as online flow) ─────────
  const variantIds = items.map((i: any) => i.variant_id);

  const { data: variantRows } = await supabase
    .from('variants')
    .select('id, products(id, price, is_active)')
    .in('id', variantIds);

  if (!variantRows?.length) {
    return NextResponse.json({ error: 'Could not verify product pricing' }, { status: 500 });
  }

  const priceMap = new Map<string, number>();
  for (const row of variantRows) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products as any;
    if (!product?.is_active) {
      return NextResponse.json({ error: 'A product is no longer available' }, { status: 400 });
    }
    priceMap.set(row.id, product.price as number);
  }

  const { data: invRows } = await supabase
    .from('inventory')
    .select('variant_id, quantity')
    .in('variant_id', variantIds);
  const invMap = new Map<string, number>();
  invRows?.forEach((r: any) => invMap.set(r.variant_id, r.quantity));

  // ── FIX: Replace items.map() + throw with a for...of loop that
  // returns a proper JSON error response instead of throwing an
  // uncaught exception that gives the frontend a non-JSON 500.
  let subtotal = 0;
  const verifiedItems: any[] = [];

  for (const item of items) {
    const available = invMap.get(item.variant_id) ?? 0;
    if (available < item.quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock for one or more items. Please update your cart.' },
        { status: 400 }
      );
    }
    const price = priceMap.get(item.variant_id);
    if (price === undefined) {
      return NextResponse.json(
        { error: 'Could not verify price for one or more items.' },
        { status: 500 }
      );
    }
    subtotal += price * item.quantity;
    verifiedItems.push({ ...item, price });
  }

  const shipping = subtotal >= 999 ? 0 : 99;

  // ── COD fraud guard 1: max total ──────────────────────────────────
  const preFinalTotal = subtotal + shipping;
  if (preFinalTotal > 2000) {
    return NextResponse.json(
      { error: 'Cash on Delivery is not available for orders above ₹2,000. Please pay online.' },
      { status: 400 }
    );
  }

  // ── COD fraud guard 2: pending COD order for same phone ───────────
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_method', 'cod')
    .in('status', ['pending', 'processing'])
    .contains('shipping_address', { phone: address.phone });

  if ((pendingOrders?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You already have a pending COD order. Please wait for it to be delivered or contact support.' },
      { status: 400 }
    );
  }

  // ── COD fraud guard 3: too many recent cancellations ─────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cancelledOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_method', 'cod')
    .eq('status', 'cancelled')
    .gte('created_at', thirtyDaysAgo)
    .contains('shipping_address', { phone: address.phone });

  if ((cancelledOrders?.length ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'COD is not available for this account. Please pay online.' },
      { status: 400 }
    );
  }

  // ── Coupon validation ─────────────────────────────────────────────
  let discountAmount = 0;
  let validatedCoupon = '';
  if (coupon_code?.trim()) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.trim().toUpperCase())
      .eq('active', true)
      .single();

    if (coupon) {
      const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
      const maxed   = coupon.used_count >= coupon.max_uses;
      const minMet  = subtotal >= (coupon.min_order ?? 0);
      if (!expired && !maxed && minMet) {
        discountAmount  = coupon.type === 'percent'
          ? Math.floor((subtotal * coupon.value) / 100)
          : coupon.value;
        discountAmount  = Math.min(discountAmount, subtotal);
        validatedCoupon = coupon.code;
      }
    }
  }

  const total = Math.max(0, subtotal + shipping - discountAmount);

  // ── Get user ──────────────────────────────────────────────────────
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    userId = user?.id ?? null;
  }

  // ── Create order ──────────────────────────────────────────────────
  const orderId = generateOrderId();

  const { error: orderErr } = await supabase.from('orders').insert({
    id:               orderId,
    user_id:          userId,
    status:           'processing',      // COD goes straight to processing
    payment_status:   'pending',         // will be paid on delivery
    payment_method:   'cod',
    subtotal,
    shipping,
    discount_amount:  discountAmount,
    coupon_code:      validatedCoupon || null,
    total,
    shipping_address: {
      name:    address.name,
      email:   address.email ?? '',
      phone:   address.phone,
      line1:   address.line1,
      line2:   address.line2 ?? '',
      city:    address.city,
      state:   address.state,
      pincode: address.pincode,
    },
  });

  if (orderErr) {
    console.error('[cod] order insert error:', orderErr);
    return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 });
  }

  await supabase.from('order_items').insert(
    verifiedItems.map((i: any) => ({
      order_id:   orderId,
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity:   i.quantity,
      price:      i.price,
    }))
  );

  // ── Decrement inventory ───────────────────────────────────────────
  for (const item of verifiedItems) {
    await supabase.rpc('decrement_inventory', {
      p_variant_id: item.variant_id,
      p_qty:        item.quantity,
    });
  }

  // ── Increment coupon usage ────────────────────────────────────────
  if (validatedCoupon) {
    await supabase.rpc('increment_coupon_usage', { p_code: validatedCoupon });
  }

  // ── Email ─────────────────────────────────────────────────────────
  const emailAddr = address.email ?? '';
  if (emailAddr) {
    try {
      await sendOrderConfirmationEmail({
        to:      emailAddr,
        name:    address.name,
        orderId,
        total,
        items:   verifiedItems,
        address,
        paymentMethod: 'cod',
      });
      await supabase.from('orders').update({ email_sent: true }).eq('id', orderId);
    } catch (e: any) {
      console.error('[cod] email error:', e.message);
    }
  }

  // ── Admin notification email ──────────────────────────────────────
  try {
    await sendAdminNewOrderEmail({
      orderId,
      total,
      paymentMethod: 'cod',
      customerName:  address.name,
      customerEmail: address.email ?? '',
      customerPhone: address.phone,
      items:         verifiedItems,
    });
  } catch (e: any) {
    console.error('[cod] admin notification email error:', e.message);
  }

  // ── Shiprocket ────────────────────────────────────────────────────
  // FIX: await directly with a timeout wrapper instead of fire-and-forget.
  // Promise.resolve().then() is not guaranteed to complete in Vercel serverless
  // after the response is returned — the lambda may be frozen immediately.
  try {
    const shiprocketTimeout = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Shiprocket timeout after 8s')), 8000)
    );
    const shiprocketPush = createShiprocketOrder({
      order_id:         orderId,
      order_date:       new Date().toISOString(),
      shipping_address: address,
      items:            verifiedItems,
      total,
      payment_method:   'cod',
    });

    const sr = await Promise.race([shiprocketPush, shiprocketTimeout]) as any;
    if (sr?.order_id) {
      await supabase
        .from('orders')
        .update({ shiprocket_order_id: sr.order_id, shiprocket_shipment_id: sr.shipment_id })
        .eq('id', orderId);
    }
  } catch (e: any) {
    // Non-fatal: log for manual retry. Order is confirmed even if Shiprocket fails.
    console.error('[cod] Shiprocket push failed:', e.message);
  }

  return NextResponse.json({ order_id: orderId, total });
}