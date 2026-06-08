/**
 * POST /api/shiprocket/webhook?token=<SHIPROCKET_WEBHOOK_TOKEN>
 *
 * ⚠️  SHIPROCKET PAUSED
 * While SHIPROCKET_PAUSED !== 'false', incoming webhooks are acknowledged
 * with 200 but NOT processed (no DB writes). This prevents Shiprocket from
 * hammering the endpoint with retries while still draining its queue cleanly.
 *
 * To re-enable: set SHIPROCKET_PAUSED=false in .env and redeploy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';

const SR_STATUS_MAP: Record<string, string> = {
  'New':                'processing',
  'Pickup Scheduled':   'processing',
  'Picked Up':          'processing',
  'In Transit':         'shipped',
  'Out for Delivery':   'shipped',
  'Delivered':          'delivered',
  'Cancelled':          'cancelled',
  'RTO Initiated':      'processing',
  'RTO In Transit':     'processing',
  'RTO Delivered':      'cancelled',
};

export async function POST(req: NextRequest) {
  const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.error(
      '[shiprocket/webhook] SHIPROCKET_WEBHOOK_TOKEN is not set. ' +
      'All webhook requests will be rejected.'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get('token');
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Pause guard ──────────────────────────────────────────────────────────
  // Acknowledge with 200 so Shiprocket stops retrying, but do not process.
  if (process.env.SHIPROCKET_PAUSED !== 'false') {
    console.info('[shiprocket/webhook] PAUSED — webhook received but not processed.');
    return NextResponse.json({ ok: false, reason: 'paused' }, { status: 200 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId =
    payload?.channel_order_id?.toString() ??
    payload?.order_id?.toString()         ??
    '';

  const awb      = payload?.awb_code     ?? payload?.awb          ?? '';
  const courier  = payload?.courier_name ?? payload?.courier      ?? '';
  const srStatus = payload?.current_status ?? payload?.status     ?? '';
  const location = payload?.current_city   ?? payload?.city       ?? '';
  const remarks  = payload?.reason         ?? '';
  const eventAt  = payload?.updated_at     ?? new Date().toISOString();

  if (!orderId) {
    console.warn('[shiprocket/webhook] Payload has no identifiable order ID', {
      keys: Object.keys(payload ?? {}),
    });
    return NextResponse.json({ ok: false, reason: 'missing_order_id' }, { status: 200 });
  }

  const supabase  = createAdmin();
  const newStatus = SR_STATUS_MAP[srStatus];

  const updatePayload: Record<string, any> = {};
  if (newStatus) updatePayload.status         = newStatus;
  if (awb)       updatePayload.awb_code       = awb;
  if (courier)   updatePayload.courier        = courier;
  if (awb)       updatePayload.tracking_number = awb;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateErr) {
      console.error('[shiprocket/webhook] Order update failed:', {
        orderId, updatePayload, error: updateErr.message,
      });
    }
  }

  if (srStatus) {
    const { error: eventErr } = await supabase.from('shipping_events').insert({
      order_id: orderId,
      awb:      awb      || null,
      status:   srStatus,
      location: location || null,
      remarks:  remarks  || null,
      event_at: eventAt,
    });

    if (eventErr) {
      console.error('[shiprocket/webhook] shipping_events insert failed:', {
        orderId, srStatus, error: eventErr.message,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
