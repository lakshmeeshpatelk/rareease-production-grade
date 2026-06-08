/**
 * GET /api/orders/track?order_id=RE-XXXX
 *
 * FIXES applied vs original:
 *
 * FIX-1: CRITICAL — Query parameter name mismatch.
 *   Frontend calls: /api/orders/track?id=RE-XXXX
 *   Route reads:    req.nextUrl.searchParams.get('order_id')
 *   Result: orderId is always null → every tracking request returns 400.
 *   Fix: Accept both 'id' and 'order_id' so both old and new callers work.
 *
 * FIX-2: No auth check — any user can look up any order by guessing an ID.
 *   For a customer-facing endpoint, the order_id format (RE-YYYYMMDD-XXXX)
 *   is somewhat hard to guess, but we should still verify ownership for
 *   logged-in users. Guest orders remain readable by ID (support use-case).
 *   Fix: If caller is authenticated, verify order belongs to them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin }  from '@/lib/supabaseAdmin';
import { createClient as createServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  // FIX-1: Accept both 'id' (used by frontend) and 'order_id' (documented name)
  const orderId =
    req.nextUrl.searchParams.get('order_id') ??
    req.nextUrl.searchParams.get('id')       ??
    '';

  if (!orderId) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  // FIX-2: Optionally verify ownership for authenticated callers
  let callerId: string | null = null;
  try {
    const serverClient = await createServer();
    const { data: { user } } = await serverClient.auth.getUser();
    callerId = user?.id ?? null;
  } catch {
    // Not authenticated — guest lookup, allowed
  }

  const supabase = createAdmin();

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
      user_id,
      shipping_events (
        id,
        status,
        location,
        remarks,
        event_at
      )
    `)
    .eq('id', orderId.toUpperCase())
    .order('event_at', { referencedTable: 'shipping_events', ascending: false })
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // FIX-2: If caller is logged in and order has an owner, enforce ownership
  if (callerId && order.user_id && order.user_id !== callerId) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const addr = order.shipping_address as any;
  return NextResponse.json({
    id:              order.id,
    status:          order.status,
    payment_status:  order.payment_status,
    payment_method:  order.payment_method,
    total:           order.total,
    created_at:      order.created_at,
    customer_name:   addr?.name  ?? '',
    customer_email:  addr?.email ?? '',
    awb_code:        order.awb_code        ?? null,
    courier:         order.courier         ?? null,
    tracking_number: order.tracking_number ?? null,
    shipping_events: order.shipping_events ?? [],
  });
}