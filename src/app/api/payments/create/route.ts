/**
 * POST /api/payments/create
 *
 * Steps:
 *  1. Rate-limit by IP
 *  2. Validate & sanitise input
 *  3. Re-fetch authoritative prices from DB (never trust client)
 *  4. Check inventory availability
 *  5. Validate coupon (if supplied)
 *  6. Compute final total
 *  7. Create order record (status=pending)
 *  8. Create Razorpay order (amount in paise)
 *  9. Persist razorpay_order_id on our order  ← ERROR NOW CHECKED
 * 10. Return { order_id, razorpay_order_id, razorpay_key_id, amount, currency }
 *
 * The frontend uses razorpay_order_id + razorpay_key_id to open the
 * Razorpay checkout. After the user pays, the frontend calls
 * POST /api/payments/verify with the three Razorpay IDs + signature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin }  from '@/lib/supabaseAdmin';
import { createRazorpayOrder, getRazorpayKeyId } from '@/lib/razorpay';
import { checkRateLimit }               from '@/lib/rateLimit';
import { generateOrderId }              from '@/lib/orderUtils';

interface OrderItem {
  variant_id: string;
  product_id: string;
  quantity:   number;
  price:      number;
}

interface AddressInput {
  name:    string; email: string; phone: string;
  line1:   string; line2?: string;
  city:    string; state:  string; pincode: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const limited = await checkRateLimit(`pay:${ip}`, 10, 600);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Please wait a few minutes.' },
      { status: 429 }
    );
  }

  let body: {
    items:           OrderItem[];
    address:         AddressInput;
    coupon_code?:    string;
    payment_method?: 'online' | 'cod';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { items, address, coupon_code } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }
  if (!address?.name || !address?.email || !address?.phone || !address?.line1) {
    return NextResponse.json({ error: 'Incomplete delivery address' }, { status: 400 });
  }
  if (!/^\d{10}$/.test(address.phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }
  if (!/^\d{6}$/.test(address.pincode)) {
    return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 });
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      return NextResponse.json({ error: 'Invalid item quantity (1–10 allowed)' }, { status: 400 });
    }
  }

  const supabase = createAdmin();

  const variantIds = items.map(i => i.variant_id);
  const { data: variantRows, error: vErr } = await supabase
    .from('variants')
    .select('id, product_id, products(id, price, is_active)')
    .in('id', variantIds);

  if (vErr || !variantRows?.length) {
    return NextResponse.json({ error: 'Could not verify product pricing' }, { status: 500 });
  }

  const priceMap = new Map<string, number>();
  for (const row of variantRows) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products as any;
    if (!product?.is_active) {
      return NextResponse.json(
        { error: 'A product in your cart is no longer available' },
        { status: 400 }
      );
    }
    priceMap.set(row.id, product.price as number);
  }

  const { data: invRows } = await supabase
    .from('inventory')
    .select('variant_id, quantity')
    .in('variant_id', variantIds);

  const invMap = new Map<string, number>();
  invRows?.forEach(r => invMap.set(r.variant_id, r.quantity));

  for (const item of items) {
    const avail = invMap.get(item.variant_id) ?? 0;
    if (avail < item.quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock for one or more items. Please update your cart.' },
        { status: 400 }
      );
    }
  }

  let subtotal = 0;
  const verifiedItems = items.map(item => {
    const unitPrice = priceMap.get(item.variant_id)!;
    subtotal += unitPrice * item.quantity;
    return { ...item, price: unitPrice };
  });

  const shipping = subtotal >= 1499 ? 0 : 99; // must match SHIPPING_FREE_THRESHOLD in utils.ts

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
        discountAmount = coupon.type === 'percent'
          ? Math.floor((subtotal * coupon.value) / 100)
          : coupon.value;
        discountAmount  = Math.min(discountAmount, subtotal);
        validatedCoupon = coupon.code;
      }
    }
  }

  const total = Math.max(0, subtotal + shipping - discountAmount);

  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id ?? null;
  }

  const orderId = generateOrderId();

  const { error: orderErr } = await supabase.from('orders').insert({
    id:              orderId,
    user_id:         userId,
    status:          'pending',
    payment_status:  'pending',
    payment_method:  'online',
    subtotal,
    shipping,
    discount_amount: discountAmount,
    coupon_code:     validatedCoupon || null,
    total,
    shipping_address: {
      name:    address.name,
      email:   address.email,
      phone:   address.phone,
      line1:   address.line1,
      line2:   address.line2 ?? '',
      city:    address.city,
      state:   address.state,
      pincode: address.pincode,
    },
  });

  if (orderErr) {
    console.error('[payments/create] order insert error:', orderErr);
    return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 500 });
  }

  const { error: itemErr } = await supabase.from('order_items').insert(
    verifiedItems.map(i => ({
      order_id:   orderId,
      product_id: i.product_id,
      variant_id: i.variant_id,
      quantity:   i.quantity,
      price:      i.price,
    }))
  );

  if (itemErr) {
    await supabase.from('orders').delete().eq('id', orderId);
    console.error('[payments/create] order_items insert error:', itemErr);
    return NextResponse.json({ error: 'Failed to create order items.' }, { status: 500 });
  }

  // Razorpay expects amount in paise (₹1 = 100 paise)
  const amountInPaise = Math.round(total * 100);

  let rzpOrder;
  try {
    rzpOrder = await createRazorpayOrder({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  orderId,
      notes: {
        order_id:       orderId,
        customer_name:  address.name,
        customer_phone: address.phone,
      },
    });
  } catch (e: any) {
    // Clean up the order so it's not stuck as a zombie pending row
    await supabase
      .from('orders')
      .update({ payment_status: 'failed', status: 'cancelled' })
      .eq('id', orderId);

    console.error('[payments/create] Razorpay error:', e.message);
    return NextResponse.json(
      { error: 'Payment gateway error. Please try again in a moment.' },
      { status: 502 }
    );
  }

  // ── FIX: Check the error on this update. If it fails silently,
  // the webhook cannot find the order by razorpay_order_id, and
  // the payment is captured by Razorpay but never confirmed in our DB.
  const { error: rzpIdErr } = await supabase
    .from('orders')
    .update({ razorpay_order_id: rzpOrder.id })
    .eq('id', orderId);

  if (rzpIdErr) {
    console.error('[payments/create] CRITICAL: Failed to persist razorpay_order_id:', rzpIdErr);
    // Cancel the order — the webhook will never be able to find it.
    // The customer will need to try again.
    await supabase
      .from('orders')
      .update({ payment_status: 'failed', status: 'cancelled' })
      .eq('id', orderId);
    return NextResponse.json(
      { error: 'Payment initialisation failed. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    order_id:          orderId,
    razorpay_order_id: rzpOrder.id,
    razorpay_key_id:   getRazorpayKeyId(),
    amount:            amountInPaise,
    currency:          'INR',
    total,
  });
}