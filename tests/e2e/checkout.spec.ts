/**
 * tests/e2e/checkout.spec.ts
 * E2E: COD checkout happy path + validation errors
 *
 * Run: npx playwright test tests/e2e/checkout.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Checkout — COD happy path', () => {
  test('validation errors show for empty address fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open checkout directly (assumes CheckoutOverlay is triggered from navbar or cart)
    // We POST directly to the API to verify server-side validation
    const res = await page.request.post('/api/payments/create', {
      data: {
        items: [],
        shippingAddress: { name: '', phone: '', email: '' },
        amount: 0,
        paymentMethod: 'cod',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty|incomplete/i);
  });

  test('COD over ₹2000 is rejected server-side', async ({ page }) => {
    const res = await page.request.post('/api/payments/create', {
      data: {
        items: [{ productId: 'p1', variantId: 'v1', quantity: 1, price: 2500 }],
        shippingAddress: {
          name: 'Test', phone: '9876543210', email: 'test@test.com',
          line1: '1 Test St', city: 'Mumbai', state: 'MH', pincode: '400001',
        },
        amount: 2500,
        paymentMethod: 'cod',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2000/);
  });

  test('invalid pincode is rejected', async ({ page }) => {
    const res = await page.request.post('/api/payments/create', {
      data: {
        items: [{ productId: 'p1', variantId: 'v1', quantity: 1, price: 999 }],
        shippingAddress: {
          name: 'Test', phone: '9876543210', email: 'test@test.com',
          line1: '1 Test St', city: 'Mumbai', state: 'MH', pincode: 'BADPIN',
        },
        amount: 999,
        paymentMethod: 'cod',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/pincode/i);
  });
});

test.describe('Checkout — payment verify', () => {
  test('rejects tampered payment signature', async ({ page }) => {
    const res = await page.request.post('/api/payments/verify', {
      data: {
        orderId: 'RE_FAKE',
        razorpayOrderId: 'order_fake',
        razorpayPaymentId: 'pay_fake',
        razorpaySignature: 'totally_fake_sig',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/signature/i);
  });
});
