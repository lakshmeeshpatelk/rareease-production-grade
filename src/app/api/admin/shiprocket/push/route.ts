import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { createShiprocketOrder, isShiprocketConfigured } from '@/lib/shiprocket';
import { requireAdmin } from '@/lib/adminAuth';
import { captureException } from '@/lib/monitoring';

/**
 * POST /api/admin/shiprocket/push
 *
 * Manually push an order to Shiprocket from the admin panel.
 * Useful when:
 *  - Shiprocket was down at time of order
 *  - Order was created before Shiprocket integration
 *  - Admin wants to re-push after editing order details
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  try {
    const { orderId } = await req.json() as { orderId?: string };
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    if (!isShiprocketConfigured) {
      return NextResponse.json({ error: 'Shiprocket is not configured on this server' }, { status: 503 });
    }

    const supabase = createAdminClient();

    // Fetch full order with items + product names
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          variant_id, quantity, price,
          product:products ( id, name )
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const addr    = order.shipping_address as Record<string, string>;
    const items   = order.items as Array<{
      variant_id: string;
      quantity:   number;
      price:      number;
      product:    { id: string; name: string } | null;
    }>;

    const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary';

    const result = await createShiprocketOrder({
      orderId:         orderId,
      orderDate:       new Date(order.created_at as string).toISOString().split('T')[0],
      pickupLocation,
      billingName:     addr.name,
      billingAddress:  addr.line1,
      billingAddress2: addr.line2,
      billingCity:     addr.city,
      billingPincode:  addr.pincode,
      billingState:    addr.state,
      billingCountry:  addr.country ?? 'India',
      billingEmail:    addr.email,
      billingPhone:    addr.phone,
      items: items.map(i => ({
        name:          i.product?.name ?? '—',
        sku:           i.variant_id,
        units:         i.quantity,
        selling_price: i.price,
      })),
      paymentMethod: (order.payment_method as string) === 'cod' ? 'COD' : 'Prepaid',
      subTotal:      order.total as number,
      length: 30, breadth: 20, height: 10,
      weight: 0.5 * items.reduce((s, i) => s + i.quantity, 0),
    });

    // Persist Shiprocket IDs
    await supabase.from('orders').update({
      shiprocket_order_id:    result.order_id,
      shiprocket_shipment_id: result.shipment_id,
      awb_code:               result.awb_code    ?? null,
      courier:                result.courier_name ?? null,
      tracking_number:        result.awb_code    ?? null,
    }).eq('id', orderId);

    return NextResponse.json({
      success:      true,
      order_id:     result.order_id,
      shipment_id:  result.shipment_id,
      awb_code:     result.awb_code,
      courier_name: result.courier_name,
    });

  } catch (err) {
    await captureException(err, { route: 'admin/shiprocket/push' });
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}