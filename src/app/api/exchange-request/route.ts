/**
 * POST /api/exchange-request
 *
 * Submits a customer return / exchange request and sends an admin
 * notification email. Requires a valid user session.
 *
 * Body: { order_id, type: 'exchange' | 'cancellation', reason }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@/lib/supabaseAdmin';
import { sendAdminExchangeRequestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { order_id, type, reason } = body;

  if (!order_id || !type || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (type !== 'exchange' && type !== 'cancellation') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // ── Authenticate the user ─────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const token   = authHeader.replace('Bearer ', '');
  const supabase = createAdmin();

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // ── Verify the order belongs to this user ─────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, shipping_address')
    .eq('id', order_id)
    .eq('user_id', user.id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // ── Prevent duplicate pending requests ────────────────────────────
  const { data: existing } = await supabase
    .from('exchange_requests')
    .select('id')
    .eq('order_id', order_id)
    .eq('status', 'pending')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'A request for this order is already pending.' },
      { status: 409 }
    );
  }

  // ── Insert the request ────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await supabase
    .from('exchange_requests')
    .insert({
      order_id,
      user_id: user.id,
      type,
      reason,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('[exchange-request] insert error:', insertErr?.message);
    return NextResponse.json({ error: 'Could not submit request. Please try again.' }, { status: 500 });
  }

  // ── Admin notification email (non-fatal) ──────────────────────────
  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  try {
    await sendAdminExchangeRequestEmail({
      requestId:     inserted.id,
      orderId:       order_id,
      type,
      reason,
      customerName:  addr.name  ?? user.email ?? 'Unknown',
      customerEmail: addr.email ?? user.email ?? '',
      customerPhone: addr.phone ?? '',
    });
  } catch (e: any) {
    // Non-fatal — request is saved even if email fails
    console.error('[exchange-request] admin notification email error:', e.message);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
