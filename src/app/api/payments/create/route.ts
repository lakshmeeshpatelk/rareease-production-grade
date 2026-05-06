import { NextRequest, NextResponse } from 'next/server';
import { createCashfreeOrder, isCashfreeConfigured } from '@/lib/cashfree';
import { isShiprocketConfigured, pushOrderToShiprocket } from '@/lib/shiprocket';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { isRateLimited, getIP, LIMITS } from '@/lib/rateLimit';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { captureException, setRequestContext } from '@/lib/monitoring';
import { SHIPPING_FREE_THRESHOLD, SHIPPING_COST } from '@/lib/utils';

const COD_MAX_AMOUNT      = 2000;
const MAX_QTY_PER_PRODUCT = 10;



interface OrderItemInput {
  productId: string;
  variantId: string;
  quantity:  number;
  price:     number;
}

export async function POST(req: NextRequest) {
  await setRequestContext(req);

  const ip = getIP(req);
  if (await isRateLimited(`payments:${ip}`, LIMITS.payments)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  try {
    const { items, shippingAddress, amount, couponCode, paymentMethod } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!shippingAddress?.name || !shippingAddress?.phone || !shippingAddress?.email) {
      return NextResponse.json({ error: 'Shipping address incomplete' }, { status: 400 });
    }
    if (!['online', 'cod'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let userId: string | null = null;
    try {
      const serverClient = await createServerClient();
      const { data: { user: authedUser } } = await serverClient.auth.getUser();
      userId = authedUser?.id ?? null;
    } catch { /* guest checkout */ }

    // Validate item inputs before any DB calls
    for (const item of items as OrderItemInput[]) {
      if (!item.productId || !item.variantId || item.quantity < 1) {
        return NextResponse.json({ error: 'Invalid item in cart' }, { status: 400 });
      }
      if (item.quantity > MAX_QTY_PER_PRODUCT) {
        return NextResponse.json(
          { error: `Maximum ${MAX_QTY_PER_PRODUCT} units allowed per product` },
          { status: 400 }
        );
      }
    }

    // Batch fetch all products and inventory in 2 queries instead of 2×N
    const productIds = (items as OrderItemInput[]).map(i => i.productId);
    const variantIds = (items as OrderItemInput[]).map(i => i.variantId);

    const [{ data: productsData }, { data: inventoryData }] = await Promise.all([
      supabase.from('products').select('id, price, name').in('id', productIds).eq('is_active', true),
      supabase.from('inventory').select('variant_id, quantity, reserved').in('variant_id', variantIds),
    ]);

    const productMap = new Map((productsData ?? []).map(p => [p.id as string, p]));
    const inventoryMap = new Map((inventoryData ?? []).map(inv => [inv.variant_id as string, inv]));

    const serverItems: Array<OrderItemInput & { serverPrice: number; productName: string }> = [];
    let serverSubtotal = 0;

    for (const item of items as OrderItemInput[]) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found or no longer available' }, { status: 400 });
      }

      const inv = inventoryMap.get(item.variantId);
      if (!inv) {
        return NextResponse.json({ error: 'Product variant not found' }, { status: 400 });
      }
      const available = (inv.quantity as number) - (inv.reserved as number);
      if (available < item.quantity) {
        return NextResponse.json(
          { error: `Only ${available} units available for one of your items` }, { status: 400 }
        );
      }

      serverItems.push({ ...item, serverPrice: product.price as number, productName: product.name as string });
      serverSubtotal += (product.price as number) * item.quantity;
    }

    // COD fraud checks
    if (paymentMethod === 'cod') {
      if (serverSubtotal > COD_MAX_AMOUNT) {
        return NextResponse.json(
          { error: `Cash on Delivery is only available for orders up to ₹${COD_MAX_AMOUNT}` }, { status: 400 }
        );
      }
      const phone = String(shippingAddress.phone ?? '').replace(/\D/g, '');
      if (phone) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingCOD } = await supabase
          .from('orders').select('id').eq('payment_method', 'cod')
          .in('status', ['pending', 'processing']).gte('created_at', since)
          .filter('shipping_address->>phone', 'eq', phone).limit(1);
        if (existingCOD && existingCOD.length > 0) {
          return NextResponse.json(
            { error: 'You already have a pending COD order. Please wait for delivery before placing another.' },
            { status: 400 }
          );
        }
        const { count } = await supabase
          .from('orders').select('id', { count: 'exact', head: true })
          .eq('payment_method', 'cod').eq('status', 'cancelled')
          .filter('shipping_address->>phone', 'eq', phone);
        if ((count ?? 0) >= 3) {
          return NextResponse.json({ error: 'COD is not available. Please use online payment.' }, { status: 400 });
        }
      }
      const pincode = String(shippingAddress.pincode ?? '').trim();
      if (!/^\d{6}$/.test(pincode)) {
        return NextResponse.json({ error: 'Invalid pincode for COD delivery' }, { status: 400 });
      }
    }

    // Coupon validation — all checks mirrored server-side so client cannot bypass them
    let discountAmount = 0;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons').select('*').eq('code', String(couponCode).toUpperCase()).eq('active', true).single();
      if (coupon) {
        const expired      = coupon.expires_at && new Date(coupon.expires_at as string) < new Date();
        const overLimit    = (coupon.used_count as number) >= (coupon.max_uses as number);
        const belowMinimum = (coupon.min_order as number) > 0 && serverSubtotal < (coupon.min_order as number);
        if (!expired && !overLimit && !belowMinimum) {
          discountAmount = coupon.type === 'percent'
            ? Math.round(serverSubtotal * (coupon.value as number) / 100)
            : Math.min(coupon.value as number, serverSubtotal);
        }
      }
    }

    const subtotalAfterDiscount = serverSubtotal - discountAmount;
    const shipping = subtotalAfterDiscount >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_COST;
    const total    = subtotalAfterDiscount + shipping;

    const orderId = `RE${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    // Create Cashfree order for online payments
    let cashfreeOrderId:  string | undefined;
    let paymentSessionId: string | undefined;

    if (paymentMethod === 'online') {
      if (!isCashfreeConfigured) {
        return NextResponse.json(
          { error: 'Online payments are not configured. Please use Cash on Delivery.' }, { status: 503 }
        );
      }
      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/payments/verify?orderId=${orderId}`;
      const cfOrder = await createCashfreeOrder({
        orderId, amount: total,
        customerName:  shippingAddress.name,
        customerEmail: shippingAddress.email,
        customerPhone: String(shippingAddress.phone),
        returnUrl,
      });
      cashfreeOrderId  = cfOrder.cf_order_id;
      paymentSessionId = cfOrder.payment_session_id;
    }

    // Save order
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId, user_id: userId, status: 'pending', payment_status: 'pending',
      payment_method: paymentMethod, cashfree_order_id: cashfreeOrderId ?? null,
      coupon_code: couponCode || null, discount_amount: discountAmount,
      subtotal: serverSubtotal, shipping, total, shipping_address: shippingAddress,
    });
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from('order_items').insert(
      serverItems.map(item => ({
        order_id: orderId, product_id: item.productId,
        variant_id: item.variantId, quantity: item.quantity, price: item.serverPrice,
      }))
    );
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', orderId);
      throw itemsError;
    }

    // COD: finalise immediately
    if (paymentMethod === 'cod') {
      for (const item of serverItems) {
        const { error: invErr } = await supabase.rpc('decrement_inventory', {
          p_variant_id: item.variantId, p_qty: item.quantity,
        });
        if (invErr) {
          await supabase.from('order_items').delete().eq('order_id', orderId);
          await supabase.from('orders').delete().eq('id', orderId);
          throw new Error(`Stock error: ${invErr.message}`);
        }
      }
      if (couponCode) await supabase.rpc('increment_coupon_usage', { p_code: couponCode });
      await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);

      // Push to Shiprocket (non-blocking) — skipped in sandbox/test mode
      const isLiveMode = (process.env.CASHFREE_ENV ?? 'sandbox') === 'production';
      if (isShiprocketConfigured && isLiveMode) {
        pushOrderToShiprocket(orderId, shippingAddress as Record<string, string>, serverItems, total, 'COD', supabase).catch(
          err => captureException(err, { route: 'payments/create', orderId, stage: 'shiprocket' })
        );
      }

      if (userId) {
        supabase.from('user_notifications').insert({
          user_id: userId, type: 'order', icon: '📦',
          msg: `Order #${orderId} confirmed — COD. Total ₹${total.toLocaleString('en-IN')}.`,
        }).then(null, console.error);
      }

      const { data: variants } = await supabase
        .from('variants').select('id, size').in('id', serverItems.map(i => i.variantId));
      const sizeMap = Object.fromEntries((variants ?? []).map(v => [v.id as string, v.size as string]));
      const addr = shippingAddress as Record<string, string>;

      sendOrderConfirmationEmail({
        orderId, name: addr.name, email: addr.email,
        items: serverItems.map(i => ({
          name: i.productName, size: sizeMap[i.variantId] ?? i.variantId,
          qty: i.quantity, price: i.serverPrice,
        })),
        subtotal: serverSubtotal, discount: discountAmount, shipping, total, method: 'cod',
        address: { line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode },
      }).then(() => {
        supabase.from('orders').update({ email_sent: true }).eq('id', orderId).then(null, console.error);
      }).catch(console.error);
    }

    return NextResponse.json({ orderId, paymentSessionId, cashfreeOrderId, total });

  } catch (err) {
    await captureException(err, { route: 'payments/create' });
    console.error("[payments/create] error:", err);
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err) ?? "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}