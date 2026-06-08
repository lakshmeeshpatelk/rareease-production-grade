/**
 * POST /api/shiprocket/webhook?token=<SHIPROCKET_WEBHOOK_TOKEN>
 *
 * FIXES applied vs original:
 *
 * FIX-1: CRITICAL — Webhook ID lookup priority was backwards.
 *   Original: payload?.order_id (Shiprocket's own numeric ID) ?? channel_order_id
 *   Problem:  Shiprocket's `order_id` field is THEIR numeric ID (e.g. 12345678),
 *             NOT our internal "RE-XXXX" string. Querying orders.id with that
 *             numeric ID will NEVER match — all status webhooks are silently dropped.
 *   Fix:      Prioritise `channel_order_id` (our "RE-XXXX"), fall back to `order_id`
 *             only as a last resort.
 *
 * FIX-2: tracking_number was only written when payload.tracking_url was present.
 *   AWB is always available once assigned — store it unconditionally.
 *
 * FIX-3: DB update errors were silently swallowed. Now logged.
 *
 * FIX-4: shipping_events insert errors are now logged.
 *
 * FIX-5: 'remarks' column was not included in shipping_events insert; fixed.
 *
 * FIX-6: Missing SHIPROCKET_WEBHOOK_TOKEN now logs a clear startup warning.
 *
 * FIX-7: Return 200 on unresolvable payloads so Shiprocket stops retrying them.
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
  // FIX-6: Warn loudly if token is not configured
  const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.error(
      '[shiprocket/webhook] SHIPROCKET_WEBHOOK_TOKEN is not set. ' +
      'All webhook requests will be rejected. ' +
      'Set this variable in your environment AND in the Shiprocket Dashboard → Webhooks.'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get('token');
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // FIX-1: CRITICAL — channel_order_id IS our internal "RE-XXXX" ID.
  //   payload.order_id is Shiprocket's own numeric ID and will NEVER
  //   match our orders.id text primary key. Priority must be reversed.
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
    // FIX-7: Return 200 — unresolvable, Shiprocket should not retry
    return NextResponse.json({ ok: false, reason: 'missing_order_id' }, { status: 200 });
  }

  const supabase  = createAdmin();
  const newStatus = SR_STATUS_MAP[srStatus];

  const updatePayload: Record<string, any> = {};
  if (newStatus) updatePayload.status         = newStatus;
  if (awb)       updatePayload.awb_code       = awb;
  if (courier)   updatePayload.courier        = courier;
  // FIX-2: Always store AWB as tracking reference (not gated on tracking_url)
  if (awb)       updatePayload.tracking_number = awb;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    // FIX-3: log failures instead of silently dropping them
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
      remarks:  remarks  || null,  // FIX-5: column existed but was never populated
      event_at: eventAt,
    });

    // FIX-4: log insert failures
    if (eventErr) {
      console.error('[shiprocket/webhook] shipping_events insert failed:', {
        orderId, srStatus, error: eventErr.message,
      });
    }
  }

  return NextResponse.json({ ok: true });
}