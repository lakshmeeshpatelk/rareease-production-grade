/**
 * POST /api/shiprocket/webhook?token=<SHIPROCKET_WEBHOOK_TOKEN>
 *
 * Receives shipment status updates from Shiprocket and:
 *  1. Validates the token
 *  2. Updates orders.status / awb_code / courier / tracking_number
 *  3. Inserts a row into shipping_events for customer tracking timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';

// Map Shiprocket status codes → our internal status
const SR_STATUS_MAP: Record<string, string> = {
  'New':          'processing',
  'Pickup Scheduled': 'processing',
  'Picked Up':    'processing',
  'In Transit':   'shipped',
  'Out for Delivery': 'shipped',
  'Delivered':    'delivered',
  'Cancelled':    'cancelled',
  'RTO Initiated': 'processing',
  'RTO In Transit': 'processing',
  'RTO Delivered': 'cancelled',
};

export async function POST(req: NextRequest) {
  // 1. Token guard
  const token         = req.nextUrl.searchParams.get('token');
  const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Shiprocket webhook shape varies by event type — normalise
  const orderId       = payload?.order_id?.toString() ?? payload?.channel_order_id?.toString();
  const awb           = payload?.awb_code  ?? payload?.awb ?? '';
  const courier       = payload?.courier_name ?? '';
  const srStatus      = payload?.current_status ?? payload?.status ?? '';
  const location      = payload?.current_city ?? '';
  const remarks       = payload?.reason ?? '';
  const eventAt       = payload?.updated_at ?? new Date().toISOString();

  if (!orderId) {
    return NextResponse.json({ ok: false, reason: 'missing_order_id' }, { status: 200 });
  }

  const supabase  = createAdmin();
  const newStatus = SR_STATUS_MAP[srStatus];

  // 2. Update order record
  const updatePayload: Record<string, any> = {};
  if (newStatus)   updatePayload.status           = newStatus;
  if (awb)         updatePayload.awb_code          = awb;
  if (courier)     updatePayload.courier           = courier;
  if (payload?.tracking_url) {
    updatePayload.tracking_number = awb; // store AWB as tracking reference
  }

  if (Object.keys(updatePayload).length > 0) {
    await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);
  }

  // 3. Insert shipping event for customer timeline
  if (srStatus) {
    await supabase.from('shipping_events').insert({
      order_id: orderId,
      awb,
      status:   srStatus,
      location,
      remarks,
      event_at: eventAt,
    });
  }

  return NextResponse.json({ ok: true });
}