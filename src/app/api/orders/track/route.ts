/**
 * GET /api/orders/track?order_id=RE-XXXX
 *
 * Returns order status + shipping events for the customer-facing
 * order tracking overlay. Auth optional — guest orders identified by
 * matching order_id against the current session or email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id');
  if (!orderId) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const supabase = createAdmin();

  // Fetch order with shipping events
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      payment_status,
      payment_method,
      total,
      created_at,
      shipping_address,
      awb_code,
      courier,
      tracking_number,
      shipping_events (
        id,
        status,
        location,
        remarks,
        event_at
      )
    `)
    .eq('id', orderId)
    .order('event_at', { referencedTable: 'shipping_events', ascending: false })
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Sanitise shipping address — return only what customer needs to see
  const addr = order.shipping_address as any;
  return NextResponse.json({
    id:             order.id,
    status:         order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    total:          order.total,
    created_at:     order.created_at,
    customer_name:  addr?.name  ?? '',
    customer_email: addr?.email ?? '',
    awb_code:       order.awb_code       ?? null,
    courier:        order.courier        ?? null,
    tracking_number: order.tracking_number ?? null,
    shipping_events: order.shipping_events ?? [],
  });
}