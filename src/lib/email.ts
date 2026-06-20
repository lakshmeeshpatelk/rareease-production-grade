/**
 * src/lib/email.ts
 * Transactional email via Resend.
 *
 * Sends order confirmation for both online (paid) and COD orders.
 * HTML is inlined — no external dependencies needed.
 */

const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const RESEND_FROM      = process.env.RESEND_FROM_EMAIL ?? 'orders@rareease.com';
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderEmailInput {
  to:            string;
  name:          string;
  orderId:       string;
  total:         number;
  paymentMethod: 'online' | 'cod';
  items: Array<{
    product_id?: string;
    variant_id?: string;
    quantity:    number;
    price:       number;
    name?:       string;
  }>;
  address: {
    name:    string;
    phone:   string;
    line1:   string;
    line2?:  string;
    city:    string;
    state:   string;
    pincode: string;
  };
}

// ─── Send order confirmation ──────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(input: OrderEmailInput): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email for order', input.orderId);
    return;
  }

  const html = buildConfirmationHTML(input);

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    `Rare Ease <${RESEND_FROM}>`,
      to:      [input.to],
      subject: `Your Rare Ease Order is Confirmed — ${input.orderId}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[email] Resend error ${res.status}: ${body}`);
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

function buildConfirmationHTML(input: OrderEmailInput): string {
  const { name, orderId, total, paymentMethod, items, address } = input;
  const isCOD = paymentMethod === 'cod';

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#D9D2C5;font-size:14px;">
        ${item.name ?? `Product (${item.product_id ?? ''})`}
        <span style="color:#888;font-size:12px;"> × ${item.quantity}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#F9F9F7;
                 font-size:14px;text-align:right;font-weight:600;">
        ${fmt(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const addrLine = [
    address.line1,
    address.line2,
    address.city,
    `${address.state} — ${address.pincode}`,
  ].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Order Confirmed — ${orderId}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica Neue,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#0a0a0a;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#111;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#000;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#F9F9F7;font-size:28px;letter-spacing:6px;
                       font-weight:700;text-transform:uppercase;">RARE EASE</h1>
            <p style="margin:8px 0 0;color:#888;font-size:12px;letter-spacing:2px;">
              WEAR THE RARE. FEEL THE EASE.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">

            <h2 style="margin:0 0 8px;color:#C3CE94;font-size:22px;
                       text-transform:uppercase;letter-spacing:2px;">
              ${isCOD ? 'Order Placed!' : 'Order Confirmed!'}
            </h2>
            <p style="margin:0 0 24px;color:#888;font-size:14px;">
              Hi ${name}, your order has been ${isCOD ? 'placed' : 'confirmed'}.
              ${isCOD
                ? 'Please keep <strong style="color:#F9F9F7;">' + fmt(total) + '</strong> ready for delivery.'
                : 'Payment received successfully.'
              }
            </p>

            <!-- Order ID -->
            <div style="background:#1a1a1a;border-radius:6px;padding:16px 20px;
                        margin-bottom:24px;">
              <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;
                        letter-spacing:1px;">Order ID</p>
              <p style="margin:4px 0 0;color:#F9F9F7;font-size:18px;
                        font-weight:700;letter-spacing:1px;">${orderId}</p>
              ${isCOD
                ? `<p style="margin:8px 0 0;color:#FEBDA6;font-size:12px;">
                     💵 Pay ${fmt(total)} in cash on delivery
                   </p>`
                : `<p style="margin:8px 0 0;color:#C3CE94;font-size:12px;">
                     ✓ Payment received — ${fmt(total)}
                   </p>`
              }
            </div>

            <!-- Items -->
            <h3 style="margin:0 0 12px;color:#F9F9F7;font-size:13px;
                       text-transform:uppercase;letter-spacing:1px;">Items Ordered</h3>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="margin-bottom:24px;">
              ${itemsHTML}
              <tr>
                <td style="padding:12px 0 0;color:#888;font-size:13px;">Total</td>
                <td style="padding:12px 0 0;color:#F9F9F7;font-size:16px;
                           font-weight:700;text-align:right;">${fmt(total)}</td>
              </tr>
            </table>

            <!-- Delivery address -->
            <h3 style="margin:0 0 10px;color:#F9F9F7;font-size:13px;
                       text-transform:uppercase;letter-spacing:1px;">Delivering To</h3>
            <div style="background:#1a1a1a;border-radius:6px;padding:14px 18px;
                        margin-bottom:28px;">
              <p style="margin:0;color:#D9D2C5;font-size:14px;line-height:1.6;">
                ${address.name} · ${address.phone}<br/>
                ${addrLine}
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:8px;">
              <a href="${APP_URL}"
                 style="display:inline-block;background:#C3CE94;color:#000;
                        text-decoration:none;padding:14px 36px;border-radius:4px;
                        font-size:13px;font-weight:700;letter-spacing:2px;
                        text-transform:uppercase;">
                CONTINUE SHOPPING
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;
                     border-top:1px solid #1a1a1a;">
            <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
              Questions? Reply to this email or WhatsApp us at
              <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''}"
                 style="color:#C3CE94;">+91 ${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''}</a>
            </p>
            <p style="margin:8px 0 0;color:#333;font-size:11px;">
              © ${new Date().getFullYear()} Rare Ease. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Admin notification helpers ───────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

/**
 * Sends an internal email to the admin whenever a new order is placed.
 * Fire-and-forget — caller should wrap in try/catch.
 */
export async function sendAdminNewOrderEmail(params: {
  orderId:       string;
  total:         number;
  paymentMethod: 'online' | 'cod';
  customerName:  string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ name?: string; quantity: number; price: number }>;
}): Promise<void> {
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    console.warn('[email] Admin order notification skipped — RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not set');
    return;
  }

  const { orderId, total, paymentMethod, customerName, customerEmail, customerPhone, items } = params;
  const isCOD = paymentMethod === 'cod';

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;color:#D9D2C5;font-size:14px;">
        ${item.name ?? 'Product'} × ${item.quantity}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;color:#F9F9F7;font-size:14px;text-align:right;font-weight:600;">
        ${fmt(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Order — ${orderId}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica Neue,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#000;padding:28px 40px;text-align:center;">
        <h1 style="margin:0;color:#F9F9F7;font-size:22px;letter-spacing:4px;font-weight:700;text-transform:uppercase;">RARE EASE — ADMIN</h1>
        <p style="margin:6px 0 0;color:#C3CE94;font-size:13px;letter-spacing:2px;">🛒 NEW ORDER RECEIVED</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <div style="background:#1a1a1a;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
          <p style="margin:4px 0 0;color:#F9F9F7;font-size:20px;font-weight:700;letter-spacing:1px;">${orderId}</p>
          <p style="margin:8px 0 0;color:${isCOD ? '#FEBDA6' : '#C3CE94'};font-size:12px;">
            ${isCOD ? '💵 Cash on Delivery' : '✓ Paid Online'} — ${fmt(total)}
          </p>
        </div>
        <h3 style="margin:0 0 12px;color:#F9F9F7;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Customer</h3>
        <div style="background:#1a1a1a;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0;color:#D9D2C5;font-size:14px;line-height:1.8;">
            ${customerName}<br/>
            ${customerEmail}<br/>
            ${customerPhone}
          </p>
        </div>
        <h3 style="margin:0 0 12px;color:#F9F9F7;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Items</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${itemsHTML}
          <tr>
            <td style="padding:12px 0 0;color:#888;font-size:13px;">Total</td>
            <td style="padding:12px 0 0;color:#F9F9F7;font-size:16px;font-weight:700;text-align:right;">${fmt(total)}</td>
          </tr>
        </table>
        <div style="text-align:center;">
          <a href="${APP_URL}/admin"
             style="display:inline-block;background:#C3CE94;color:#000;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
            VIEW IN ADMIN
          </a>
        </div>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:20px 40px;text-align:center;border-top:1px solid #1a1a1a;">
        <p style="margin:0;color:#444;font-size:11px;">© ${new Date().getFullYear()} Rare Ease — Admin Notifications</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `Rare Ease Admin <${RESEND_FROM}>`,
      to:      [ADMIN_EMAIL],
      subject: `[New Order] ${orderId} — ${isCOD ? 'COD' : 'Online'} — ${fmt(total)}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[email] Admin order notification Resend error ${res.status}: ${body}`);
  }
}

/**
 * Sends an internal email to the admin when a customer submits a
 * return / exchange request.
 */
export async function sendAdminExchangeRequestEmail(params: {
  requestId:     string;
  orderId:       string;
  type:          'exchange' | 'cancellation';
  reason:        string;
  customerName:  string;
  customerEmail: string;
  customerPhone: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    console.warn('[email] Admin exchange notification skipped — RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not set');
    return;
  }

  const { requestId, orderId, type, reason, customerName, customerEmail, customerPhone } = params;
  const label      = type === 'exchange' ? 'Exchange' : 'Return / Refund';
  const labelColor = type === 'exchange' ? '#C3CE94' : '#FEBDA6';
  const emoji      = type === 'exchange' ? '🔄' : '↩️';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${label} Request — ${orderId}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica Neue,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#000;padding:28px 40px;text-align:center;">
        <h1 style="margin:0;color:#F9F9F7;font-size:22px;letter-spacing:4px;font-weight:700;text-transform:uppercase;">RARE EASE — ADMIN</h1>
        <p style="margin:6px 0 0;color:${labelColor};font-size:13px;letter-spacing:2px;">${emoji} ${label.toUpperCase()} REQUEST</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <div style="background:#1a1a1a;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">For Order</p>
          <p style="margin:4px 0 0;color:#F9F9F7;font-size:20px;font-weight:700;letter-spacing:1px;">${orderId}</p>
          <p style="margin:8px 0 0;color:${labelColor};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
            ${label}
          </p>
        </div>
        <h3 style="margin:0 0 12px;color:#F9F9F7;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Customer</h3>
        <div style="background:#1a1a1a;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0;color:#D9D2C5;font-size:14px;line-height:1.8;">
            ${customerName}<br/>
            ${customerEmail}<br/>
            ${customerPhone}
          </p>
        </div>
        <h3 style="margin:0 0 12px;color:#F9F9F7;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Reason</h3>
        <div style="background:#1a1a1a;border-radius:6px;padding:14px 18px;margin-bottom:28px;">
          <p style="margin:0;color:#D9D2C5;font-size:14px;line-height:1.6;">${reason}</p>
        </div>
        <div style="text-align:center;">
          <a href="${APP_URL}/admin"
             style="display:inline-block;background:#C3CE94;color:#000;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
            REVIEW REQUEST
          </a>
        </div>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:20px 40px;text-align:center;border-top:1px solid #1a1a1a;">
        <p style="margin:0;color:#444;font-size:11px;">Request ID: ${requestId} · © ${new Date().getFullYear()} Rare Ease</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `Rare Ease Admin <${RESEND_FROM}>`,
      to:      [ADMIN_EMAIL],
      subject: `[${label}] Order ${orderId} — Action Required`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[email] Admin exchange notification Resend error ${res.status}: ${body}`);
  }
}
