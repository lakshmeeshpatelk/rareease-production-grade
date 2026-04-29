/**
 * email.ts — Transactional emails via Resend.
 *
 * Setup:
 *   1. Create account at resend.com (free tier: 3000 emails/month)
 *   2. Add your domain or use their test domain
 *   3. Add RESEND_API_KEY to your .env.local and Vercel project settings
 *   4. Update FROM_EMAIL below to your verified sender address
 *
 * Install: npm install resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL ?? 'orders@rareease.com';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rareease.com';

interface OrderEmailData {
  orderId:   string;
  name:      string;
  email:     string;
  items:     Array<{ name: string; size: string; qty: number; price: number }>;
  subtotal:  number;
  discount:  number;
  shipping:  number;
  total:     number;
  method:    'online' | 'cod';
  address:   {
    line1: string; line2?: string; city: string;
    state: string; pincode: string;
  };
}

function formatPrice(p: number) {
  return `₹${p.toLocaleString('en-IN')}`;
}

function buildOrderEmailHtml(d: OrderEmailData): string {
  const itemRows = d.items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#ccc;">
        ${item.name} <span style="color:#888;font-size:11px;">/ Size ${item.size}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#ccc;text-align:center;">${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #222;font-size:13px;color:#ccc;text-align:right;">${formatPrice(item.price * item.qty)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:32px;text-align:center;">
            <div style="font-size:22px;font-weight:700;letter-spacing:0.15em;color:#fff;">RARE EASE</div>
            <div style="font-size:11px;color:#666;letter-spacing:0.2em;margin-top:4px;">ORDER CONFIRMED</div>
          </td>
        </tr>

        <!-- Hero message -->
        <tr>
          <td style="background:#111;border:1px solid #1e1e1e;padding:32px;margin-bottom:20px;">
            <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:8px;">
              Thank you, ${d.name}! ✦
            </div>
            <div style="font-size:14px;color:#888;line-height:1.7;">
              Your order <strong style="color:#c3ce94;">#${d.orderId}</strong> has been confirmed and is being prepared.
              ${d.method === 'cod'
                ? 'Please keep <strong style="color:#fff;">' + formatPrice(d.total) + '</strong> ready at delivery.'
                : 'Your payment has been received successfully.'}
            </div>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- Items -->
        <tr>
          <td style="background:#111;border:1px solid #1e1e1e;padding:24px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#555;margin-bottom:16px;text-transform:uppercase;">
              Your Items
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <th style="font-size:10px;color:#555;text-align:left;padding-bottom:8px;letter-spacing:0.1em;">ITEM</th>
                <th style="font-size:10px;color:#555;text-align:center;padding-bottom:8px;letter-spacing:0.1em;">QTY</th>
                <th style="font-size:10px;color:#555;text-align:right;padding-bottom:8px;letter-spacing:0.1em;">PRICE</th>
              </tr>
              ${itemRows}
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              ${d.discount > 0 ? `
              <tr>
                <td style="font-size:12px;color:#888;padding:4px 0;">Discount</td>
                <td style="font-size:12px;color:#c3ce94;text-align:right;padding:4px 0;">− ${formatPrice(d.discount)}</td>
              </tr>` : ''}
              <tr>
                <td style="font-size:12px;color:#888;padding:4px 0;">Shipping</td>
                <td style="font-size:12px;color:${d.shipping === 0 ? '#c3ce94' : '#ccc'};text-align:right;padding:4px 0;">${d.shipping === 0 ? 'FREE' : formatPrice(d.shipping)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;font-weight:700;color:#fff;padding:12px 0 0;">Total</td>
                <td style="font-size:14px;font-weight:700;color:#fff;text-align:right;padding:12px 0 0;">${formatPrice(d.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- Delivery address -->
        <tr>
          <td style="background:#111;border:1px solid #1e1e1e;padding:24px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#555;margin-bottom:12px;text-transform:uppercase;">
              Delivery Address
            </div>
            <div style="font-size:13px;color:#aaa;line-height:1.8;">
              ${d.address.line1}${d.address.line2 ? ', ' + d.address.line2 : ''}<br>
              ${d.address.city}, ${d.address.state} — ${d.address.pincode}
            </div>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- What's next -->
        <tr>
          <td style="background:#111;border:1px solid #1e1e1e;padding:24px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#555;margin-bottom:16px;text-transform:uppercase;">
              What Happens Next
            </div>
            ${[
              { icon: '📦', text: 'We pack & dispatch within 24 hours' },
              { icon: '🚚', text: 'Delivery in 4–8 business days' },
              { icon: '📍', text: `Track your order at <a href="${APP_URL}" style="color:#c3ce94;">${APP_URL}</a>` },
            ].map(s => `
              <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
                <span style="font-size:16px;flex-shrink:0;">${s.icon}</span>
                <span style="font-size:12px;color:#888;line-height:1.6;">${s.text}</span>
              </div>
            `).join('')}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 0 0;text-align:center;">
            <div style="font-size:11px;color:#444;line-height:1.8;">
              Questions? Reply to this email or WhatsApp us.<br>
              <a href="${APP_URL}" style="color:#c3ce94;text-decoration:none;">rareease.com</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send order confirmation email.
 * Silently logs on failure — never blocks the order flow.
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(
      '[email] RESEND_API_KEY is not set — order confirmation email NOT sent for order',
      data.orderId,
      '\n  → Add RESEND_API_KEY to .env.local and your Vercel project settings.',
      '\n  → Customer will NOT receive a confirmation email until this is fixed.'
    );
    return;
  }

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1000;

  const payload = JSON.stringify({
    from:    FROM_EMAIL,
    to:      [data.email],
    subject: `Order Confirmed — #${data.orderId} | Rare Ease`,
    html:    buildOrderEmailHtml(data),
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: payload,
      });

      if (res.ok) return; // success

      const err = await res.text();
      // 4xx errors are not retryable (bad request, invalid key, etc.)
      if (res.status >= 400 && res.status < 500) {
        console.error(`[email] Resend rejected the request (${res.status}):`, err);
        return;
      }
      // 5xx — Resend outage, retry
      console.warn(`[email] Resend error ${res.status} on attempt ${attempt}/${MAX_ATTEMPTS}:`, err);
    } catch (err) {
      console.warn(`[email] Network error on attempt ${attempt}/${MAX_ATTEMPTS}:`, err);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  console.error(`[email] All ${MAX_ATTEMPTS} attempts failed for order ${data.orderId}. Email not delivered.`);
}
