import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { captureException } from '@/lib/monitoring';

/**
 * POST /api/shiprocket/webhook
 *
 * Shiprocket fires this endpoint on every shipment status change.
 * Configure it in your Shiprocket Dashboard → Settings → API → Webhooks.
 *
 * Updates:
 *  - orders.status (processing → shipped → delivered)
 *  - orders.awb_code, courier, tracking_number
 *  - shipping_events table for the customer-facing timeline
 *
 * Shiprocket does not sign webhooks with HMAC; we use a secret token
 * in the URL query string for basic protection:
 *   ?token=<SHIPROCKET_WEBHOOK_TOKEN>
 */
export async function POST(req: NextRequest) {
  try {
    const token   = req.nextUrl.searchParams.get('token') ?? '';
    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN ?? '';

    // Validate token if one is configured
    if (expected && token !== expected) {
      console.warn('[shiprocket-webhook] Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as {
      awb?: string;
      order_id?: string;
      channel_order_id?: string;   // our internal orderId
      shipment_id?: number;
      current_status?: string;
      courier_name?: string;
      etd?: string;                // estimated delivery date
      scans?: Array<{
        date: string;
        activity: string;
        location: string;
      }>;
    };

    const internalOrderId = body.channel_order_id;
    if (!internalOrderId) {
      return NextResponse.json({ received: true, skipped: 'no_order_id' });
    }

    const supabase = createAdminClient();

    const rawStatus = (body.current_status ?? '').toUpperCase();

    // Map Shiprocket status strings → our order statuses
    let newOrderStatus: string | null = null;
    if (rawStatus.includes('DELIVERED')) newOrderStatus = 'delivered';
    else if (rawStatus.includes('SHIPPED') || rawStatus.includes('IN TRANSIT') || rawStatus.includes('OUT FOR DELIVERY')) newOrderStatus = 'shipped';

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (newOrderStatus)    updatePayload.status          = newOrderStatus;
    if (body.awb)          updatePayload.awb_code        = body.awb;
    if (body.awb)          updatePayload.tracking_number = body.awb;
    if (body.courier_name) updatePayload.courier         = body.courier_name;
    if (body.shipment_id)  updatePayload.shiprocket_shipment_id = body.shipment_id;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('orders').update(updatePayload).eq('id', internalOrderId);
    }

    // Insert a shipping event for the customer-facing tracker
    if (body.current_status) {
      await supabase.from('shipping_events').insert({
        order_id:  internalOrderId,
        awb:       body.awb ?? null,
        status:    body.current_status,
        location:  body.scans?.[0]?.location ?? null,
        event_at:  new Date().toISOString(),
      });
    }

    // Notify signed-in user on key events
    if (newOrderStatus === 'shipped' || newOrderStatus === 'delivered') {
      const { data: order } = await supabase
        .from('orders').select('user_id').eq('id', internalOrderId).single();
      if (order?.user_id) {
        const icon = newOrderStatus === 'delivered' ? '✅' : '🚚';
        const msg  = newOrderStatus === 'delivered'
          ? `Your order #${internalOrderId} has been delivered!`
          : `Your order #${internalOrderId} is on its way! AWB: ${body.awb ?? '—'}`;
        supabase.from('user_notifications').insert({
          user_id: order.user_id, type: 'order', icon, msg,
        }).then(null, console.error);
      }
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    await captureException(err, { route: 'shiprocket/webhook' });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}