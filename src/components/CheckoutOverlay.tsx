'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { formatPrice, calcShipping } from '@/lib/utils';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';
import { checkPincode, type PincodeResult } from '@/lib/pincode';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  name: string; phone: string; email: string;
  line1: string; line2: string; city: string; state: string; pincode: string;
}
type PayMethod = 'online' | 'cod';

/**
 * Stores the server-computed discount amount and a human-readable label.
 * The server is the single source of truth for discount calculation.
 */
type CouponData = { amount: number; label: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Other',
];

// ─── Sub-components (unchanged from original) ─────────────────────────────────

const FormField = React.memo(function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="co-field">
      <label className="co-field-label">
        {label}{required && <span className="co-field-req">*</span>}
      </label>
      {children}
      {error && <p className="co-field-error">{error}</p>}
    </div>
  );
});

const StableInput = React.memo(
  React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function StableInput(props, ref) {
      return <input ref={ref} {...props} />;
    }
  )
);

const StableSelect = React.memo(
  React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }>(
    function StableSelect({ children, ...props }, ref) {
      return <select ref={ref} {...props}>{children}</select>;
    }
  )
);

function OrderSuccess({ orderId, method, name, onClose, onTrack }: {
  orderId: string; method: PayMethod; name: string;
  onClose: () => void; onTrack: () => void;
}) {
  return (
    <motion.div
      className="co-success"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="co-success-icon">✦</div>
      <h2 className="co-success-title">Order Placed!</h2>
      <p className="co-success-sub">
        Thank you, <strong>{name}</strong>!<br />
        Order <strong className="co-success-id">#{orderId}</strong> confirmed.
        {method === 'cod'
          ? ' Keep the exact amount ready at delivery.'
          : ' Confirmation sent to your email shortly.'}
      </p>
      <div className="co-success-steps">
        <p className="co-success-steps-label">What happens next</p>
        {[
          { icon: '📧', text: 'Order confirmation sent to your email', done: true },
          { icon: '📦', text: 'We pack & dispatch within 24 hours',   done: false },
          { icon: '🚚', text: 'Delivery in 4–8 business days',         done: false },
        ].map((s, i) => (
          <div key={i} className="co-success-step">
            <span>{s.icon}</span>
            <span className={s.done ? 'co-success-step--done' : 'co-success-step--pending'}>
              {s.text}
            </span>
          </div>
        ))}
      </div>
      <div className="co-success-actions">
        <button className="co-btn-primary" onClick={onClose}>Continue Shopping</button>
        <button className="co-btn-ghost"    onClick={onTrack}>Track Order</button>
      </div>
    </motion.div>
  );
}

function OrderSummaryStrip({ items, subtotal, discount, shipping, grandTotal }: {
  items: any[]; subtotal: number; discount: number; shipping: number; grandTotal: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="co-strip">
      <button
        className="co-strip-toggle"
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-expanded={open}
      >
        <span className="co-strip-left">
          <svg
            className={`co-strip-chevron${open ? ' co-strip-chevron--open' : ''}`}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="co-strip-text">
            {open ? 'Hide' : 'Show'} order summary
            <span className="co-strip-count">· {items.length} item{items.length !== 1 ? 's' : ''}</span>
          </span>
        </span>
        <strong className="co-strip-total">{formatPrice(grandTotal)}</strong>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="co-strip-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="co-strip-inner">
              {items.map((item: any) => (
                <div key={`${item.productId}-${item.variantId}`} className="co-order-item">
                  <div className="co-order-thumb">
                    <span className="co-order-initials">
                      {item.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="co-order-info">
                    <p className="co-order-name">{item.name}</p>
                    <p className="co-order-meta">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                  <span className="co-order-price">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="co-order-totals">
                <div className="co-order-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="co-order-row co-order-row--disc">
                    <span>Discount</span><span>− {formatPrice(discount)}</span>
                  </div>
                )}
                <div className="co-order-row">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'co-free' : ''}>
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="co-order-final"><span>Total</span><strong>{formatPrice(grandTotal)}</strong></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutOverlay() {
  // ── Zustand stores ──────────────────────────────────────────────────────────
  const { items, total, clearCart }                         = useCartStore();
  const { isCheckoutOpen, closeCheckout, addToast, openOrderTracking } = useUIStore();

  useEscapeKey(closeCheckout, isCheckoutOpen);
  useOverlayHistory(isCheckoutOpen, closeCheckout);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [payMethod, setPayMethod]     = useState<PayMethod>('online');
  const [couponInput,       setCouponInput]       = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedCoupon,     setAppliedCoupon]     = useState<CouponData | null>(null);
  const [couponError,       setCouponError]       = useState('');
  const [couponApplying,    setCouponApplying]    = useState(false);

  // ── DOM refs for stable inputs (no re-render on keystroke) ─────────────────
  const domRefs = useRef<Partial<Record<keyof Address, HTMLInputElement | HTMLSelectElement>>>({});

  const readAddress = useCallback((): Address => ({
    name:    (domRefs.current.name    as HTMLInputElement)?.value  ?? '',
    phone:   (domRefs.current.phone   as HTMLInputElement)?.value  ?? '',
    email:   (domRefs.current.email   as HTMLInputElement)?.value  ?? '',
    line1:   (domRefs.current.line1   as HTMLInputElement)?.value  ?? '',
    line2:   (domRefs.current.line2   as HTMLInputElement)?.value  ?? '',
    city:    (domRefs.current.city    as HTMLInputElement)?.value  ?? '',
    state:   (domRefs.current.state   as HTMLSelectElement)?.value ?? '',
    pincode: (domRefs.current.pincode as HTMLInputElement)?.value  ?? '',
  }), []);

  const refCallbacks = useRef<Partial<Record<keyof Address,
    (el: HTMLInputElement | HTMLSelectElement | null) => void>>>({});

  function fieldRef(key: keyof Address) {
    if (!refCallbacks.current[key]) {
      refCallbacks.current[key] = (el) => { if (el) domRefs.current[key] = el; };
    }
    return refCallbacks.current[key]!;
  }

  // ── Pincode serviceability ───────────────────────────────────────────────────
  const [pincodeValue,  setPincodeValue]  = useState('');
  const [pincodeResult, setPincodeResult] = useState<PincodeResult>({ status: 'idle' });

  useEffect(() => {
    if (pincodeValue.length !== 6) { setPincodeResult({ status: 'idle' }); return; }
    setPincodeResult({ status: 'loading' });
    checkPincode(pincodeValue).then(setPincodeResult);
  }, [pincodeValue]);

  // ── Payment state ────────────────────────────────────────────────────────────
  const [isProcessing,      setIsProcessing]      = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; method: PayMethod } | null>(null);

  // ── Derived totals ────────────────────────────────────────────────────────────
  const subtotal   = useMemo(() => total(), [items]);                                          // eslint-disable-line
  const discount   = useMemo(() => appliedCoupon?.amount ?? 0, [appliedCoupon]);
  const shipping   = useMemo(() => calcShipping(subtotal - discount), [subtotal, discount]);
  const grandTotal = useMemo(() => Math.max(0, subtotal + shipping - discount), [subtotal, shipping, discount]);
  const codBlocked = grandTotal > 2000;

  // ── Stable field change handler ───────────────────────────────────────────────
  function field(key: keyof Address) {
    return {
      ref: fieldRef(key),
      defaultValue: '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (domRefs.current[key]) (domRefs.current[key] as HTMLInputElement).value = e.target.value;
        setFieldErrors(prev => ({ ...prev, [key]: undefined }));
        if (key === 'pincode') setPincodeValue(e.target.value);
      },
      onBlur: () => {
        setFieldErrors(prev => ({ ...prev, [key]: undefined }));
        if (key === 'pincode') {
          setPincodeValue((domRefs.current.pincode as HTMLInputElement)?.value ?? '');
        }
      },
    };
  }

  // ── Address validation ────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const a    = readAddress();
    const errs: Partial<Record<keyof Address, string>> = {};

    (['name','phone','email','line1','city','state','pincode'] as (keyof Address)[])
      .forEach(k => { if (!a[k].trim()) errs[k] = 'Required'; });

    if (a.phone   && !/^\d{10}$/.test(a.phone))    errs.phone   = 'Enter a valid 10-digit number';
    if (a.email   && !a.email.includes('@'))        errs.email   = 'Enter a valid email address';
    if (a.pincode && !/^\d{6}$/.test(a.pincode))   errs.pincode = 'Enter a valid 6-digit pincode';
    if (a.pincode.length === 6 && pincodeResult.status === 'invalid') {
      errs.pincode = pincodeResult.error ?? 'Invalid pincode';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [readAddress, pincodeResult]);

  // ── Coupon validation ─────────────────────────────────────────────────────────
  // FIX: API now returns { discount_amount, message } instead of { valid, coupon }
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    setCouponApplying(true); setCouponError('');
    try {
      const res  = await fetch('/api/coupons/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired coupon code');

      const coupon: CouponData = {
        amount: data.discount_amount,
        label:  data.message,
      };
      setAppliedCoupon(coupon);
      setAppliedCouponCode(code);
      setCouponInput('');
      addToast('✓', `Coupon applied — you save ${formatPrice(data.discount_amount)}`);
    } catch (e: any) {
      setCouponError(e.message ?? 'Could not validate coupon. Please try again.');
    }
    setCouponApplying(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setAppliedCouponCode('');
    setCouponError('');
  };

  // ── Place order ───────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!validate())        { addToast('⚠', 'Please fix the errors above'); return; }
    if (items.length === 0) { addToast('⚠', 'Your cart is empty'); return; }

    const address = readAddress();
    setIsProcessing(true);

    // ── COD path ───────────────────────────────────────────────────────────────
    // FIX: COD goes to /api/orders/cod (separate route from online payments)
    // FIX: field names are now snake_case to match API expectations
    if (payMethod === 'cod') {
      try {
        const r = await fetch('/api/orders/cod', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            items: items.map(i => ({
              product_id: i.productId,
              variant_id: i.variantId,
              quantity:   i.quantity,
              price:      i.price,
            })),
            address,
            coupon_code: appliedCoupon ? appliedCouponCode : undefined,
          }),
        });

        if (!r.ok) {
          const e = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error ?? 'Failed to place COD order');
        }

        // FIX: API returns order_id (snake_case)
        const { order_id } = await r.json();
        clearCart();
        setSuccessOrder({ id: order_id, method: 'cod' });

      } catch (err) {
        addToast('✕', err instanceof Error ? err.message : 'Could not place order. Please try again.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ── Online payment path ────────────────────────────────────────────────────
    try {
      // 1. Create order + get Razorpay order details
      const orderRes = await fetch('/api/payments/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          items: items.map(i => ({
            product_id: i.productId,
            variant_id: i.variantId,
            quantity:   i.quantity,
            price:      i.price,
          })),
          address,
          coupon_code:    appliedCoupon ? appliedCouponCode : undefined,
          payment_method: 'online',
        }),
      });

      if (!orderRes.ok) {
        const e = await orderRes.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? 'Failed to create order');
      }

      const {
        order_id,
        razorpay_order_id,
        razorpay_key_id,
        amount,
        currency,
      } = await orderRes.json() as {
        order_id:          string;
        razorpay_order_id: string;
        razorpay_key_id:   string;
        amount:            number;
        currency:          string;
        total:             number;
      };

      if (!razorpay_order_id) throw new Error('No payment order returned from server');

      // 2. Load Razorpay JS SDK (cached — only fetches once)
      await loadRazorpayScript();

      if (!window.Razorpay) throw new Error('Razorpay SDK failed to initialise');

      // 3. Open Razorpay checkout
      // Hide checkout overlay so Razorpay modal renders on top
      setIsPaymentModalOpen(true);

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key:         razorpay_key_id,
          order_id:    razorpay_order_id,
          amount,
          currency,
          name:        'Rare Ease',
          description: `Order ${order_id}`,
          prefill: {
            name:    address.name,
            email:   address.email,
            contact: address.phone,
          },
          theme: { color: '#1a1a1a' },

          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            // 4. Verify signature server-side before trusting success
            try {
              const vr = await fetch('/api/payments/verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                  orderId:           order_id,
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const vd = await vr.json() as { payment_status?: string };

              if (vr.ok && vd.payment_status === 'paid') {
                clearCart();
                setSuccessOrder({ id: order_id, method: 'online' });
              } else {
                addToast('✕', 'Payment verification failed. Contact support with order ID: ' + order_id);
              }
            } catch {
              addToast('✕', 'Could not verify payment. Contact support with order ID: ' + order_id);
            }
            resolve();
          },

          modal: {
            ondismiss: () => {
              // User closed the modal without paying
              addToast('✕', 'Payment was cancelled.');
              resolve();
            },
          },
        });

        rzp.on('payment.failed', (response: { error: { description: string } }) => {
          addToast('✕', response?.error?.description ?? 'Payment failed. Please try again.');
          resolve();
        });

        rzp.open();
      });

    } catch (err) {
      addToast('✕', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsPaymentModalOpen(false);
      setIsProcessing(false);
    }
  };

  // ── Close handler ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    closeCheckout();
    setTimeout(() => {
      setSuccessOrder(null);
      setAppliedCoupon(null);
      setAppliedCouponCode('');
      setCouponInput('');
      setCouponError('');
      setPincodeResult({ status: 'idle' });
      setFieldErrors({});
      setPayMethod('online');
    }, 400);
  };

  // ── Shared pay button ─────────────────────────────────────────────────────────
  const PayBtn = ({ className }: { className: string }) => (
    <button
      className={className}
      onClick={handlePayment}
      disabled={isProcessing}
      type="button"
    >
      {isProcessing
        ? <span className="co-spinner-wrap"><span className="co-spinner" />Processing…</span>
        : payMethod === 'cod'
          ? `Place COD Order — ${formatPrice(grandTotal)}`
          : `Pay ${formatPrice(grandTotal)} Securely →`}
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <motion.div
          className="co-overlay"
          role="dialog" aria-modal="true" aria-label="Checkout"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={isPaymentModalOpen ? { opacity: 0, pointerEvents: 'none' } : undefined}
        >
          {/* ── HEADER ───────────────────────────────────────────────── */}
          <div className="co-header">
            <span className="co-logo">RARE EASE</span>
            <div className="co-steps">
              {[
                { num: '✓', label: 'Cart',    cls: 'co-step-num--done'                           },
                { num: '2', label: 'Details', cls: successOrder ? '' : 'co-step-num--active'      },
                { num: '3', label: 'Payment', cls: ''                                              },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="co-step-line" aria-hidden="true" />}
                  <div className="co-step-item">
                    <span className={`co-step-num ${s.cls}`}>{s.num}</span>
                    <span className={`co-step-label${s.cls === 'co-step-num--active' ? ' co-step-label--active' : ''}`}>
                      {s.label}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <button className="co-close" onClick={handleClose} aria-label="Close checkout" type="button">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── SUCCESS SCREEN ────────────────────────────────────────── */}
          {successOrder ? (
            <div className="co-scroll-area">
              <OrderSuccess
                orderId={successOrder.id}
                method={successOrder.method}
                name={(domRefs.current.name as HTMLInputElement)?.value ?? ''}
                onClose={handleClose}
                onTrack={() => { handleClose(); setTimeout(() => openOrderTracking(), 450); }}
              />
            </div>
          ) : (
            <>
              {/* ── Mobile order summary strip ────────────────────────── */}
              <div className="co-strip-wrap">
                <OrderSummaryStrip
                  items={items} subtotal={subtotal} discount={discount}
                  shipping={shipping} grandTotal={grandTotal}
                />
              </div>

              {/* ── Two-column layout ─────────────────────────────────── */}
              <div className="co-layout">

                {/* FORM SIDE */}
                <div className="co-form-side">

                  {/* Section 1 — Contact */}
                  <div className="co-section">
                    <div className="co-section-head">
                      <span className="co-section-num">1</span>
                      <h2 className="co-section-title">Contact Info</h2>
                    </div>
                    <div className="co-row-2">
                      <FormField label="Full Name" required error={fieldErrors.name}>
                        <StableInput
                          className="co-input"
                          placeholder="Aryan Kumar"
                          autoComplete="name"
                          autoCorrect="off"
                          spellCheck={false}
                          {...field('name')}
                        />
                      </FormField>
                      <FormField label="Phone" required error={fieldErrors.phone}>
                        <StableInput
                          className="co-input"
                          placeholder="9876543210"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          {...field('phone')}
                        />
                      </FormField>
                    </div>
                    <FormField label="Email Address" required error={fieldErrors.email}>
                      <StableInput
                        className="co-input"
                        placeholder="you@example.com"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        {...field('email')}
                      />
                    </FormField>
                  </div>

                  <div className="co-divider" />

                  {/* Section 2 — Address */}
                  <div className="co-section">
                    <div className="co-section-head">
                      <span className="co-section-num">2</span>
                      <h2 className="co-section-title">Delivery Address</h2>
                    </div>
                    <FormField label="Address Line 1" required error={fieldErrors.line1}>
                      <StableInput
                        className="co-input"
                        placeholder="House / Flat / Building, Street"
                        autoComplete="address-line1"
                        {...field('line1')}
                      />
                    </FormField>
                    <FormField label="Address Line 2 (optional)" error={fieldErrors.line2}>
                      <StableInput
                        className="co-input"
                        placeholder="Landmark, Area"
                        autoComplete="address-line2"
                        {...field('line2')}
                      />
                    </FormField>
                    <div className="co-row-2">
                      <FormField label="City" required error={fieldErrors.city}>
                        <StableInput
                          className="co-input"
                          placeholder="Bengaluru"
                          autoComplete="address-level2"
                          autoCorrect="off"
                          {...field('city')}
                        />
                      </FormField>
                      <FormField label="Pincode" required error={fieldErrors.pincode}>
                        <div className="co-pincode-wrap">
                          <StableInput
                            className="co-input co-input--padright"
                            placeholder="560001"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="postal-code"
                            {...field('pincode')}
                          />
                          {pincodeResult.status === 'loading' && <span className="co-pin-icon co-pin-icon--loading">…</span>}
                          {pincodeResult.status === 'valid'   && <span className="co-pin-icon co-pin-icon--valid">✓</span>}
                          {pincodeResult.status === 'invalid' && <span className="co-pin-icon co-pin-icon--invalid">✗</span>}
                        </div>
                        {pincodeResult.status === 'valid' && pincodeResult.district && (
                          <p className="co-pin-hint">✓ {pincodeResult.district}, {pincodeResult.state}</p>
                        )}
                      </FormField>
                    </div>
                    <FormField label="State" required error={fieldErrors.state}>
                      <StableSelect className="co-input co-input--select" {...field('state')}>
                        <option value="">Select state</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </StableSelect>
                    </FormField>
                  </div>

                  <div className="co-divider" />

                  {/* Section 3 — Payment method */}
                  <div className="co-section">
                    <div className="co-section-head">
                      <span className="co-section-num">3</span>
                      <h2 className="co-section-title">Payment Method</h2>
                    </div>
                    <div className="co-pay-methods">
                      <button
                        type="button"
                        className={`co-pay-card${payMethod === 'online' ? ' co-pay-card--active' : ''}`}
                        onClick={() => setPayMethod('online')}
                      >
                        <span className="co-pay-card-icon">💳</span>
                        <div className="co-pay-card-body">
                          <span className="co-pay-card-title">Pay Online</span>
                          <span className="co-pay-card-sub">Cards · UPI · Net Banking · Wallets</span>
                        </div>
                        <span className={`co-radio${payMethod === 'online' ? ' co-radio--on' : ''}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`co-pay-card${payMethod === 'cod' ? ' co-pay-card--active' : ''}${codBlocked ? ' co-pay-card--off' : ''}`}
                        onClick={() => !codBlocked && setPayMethod('cod')}
                        disabled={codBlocked}
                      >
                        <span className="co-pay-card-icon">💵</span>
                        <div className="co-pay-card-body">
                          <span className="co-pay-card-title">Cash on Delivery</span>
                          <span className="co-pay-card-sub">
                            {codBlocked ? 'Not available above ₹2,000' : 'Pay when your order arrives'}
                          </span>
                        </div>
                        <span className={`co-radio${payMethod === 'cod' ? ' co-radio--on' : ''}`} aria-hidden="true" />
                      </button>
                    </div>
                    {payMethod === 'cod' && (
                      <div className="co-cod-notice">
                        <span>💡</span>
                        <p>
                          COD orders may take slightly longer. Please keep the exact amount ready.
                          Only available for orders up to ₹2,000.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="co-divider" />

                  {/* Section 4 — Coupon */}
                  <div className="co-section">
                    <div className="co-section-head">
                      <span className="co-section-num">4</span>
                      <h2 className="co-section-title">Coupon Code</h2>
                    </div>
                    {appliedCoupon ? (
                      <div className="co-coupon-applied">
                        <div>
                          {/* FIX: uses label + amount from server response */}
                          <p className="co-coupon-applied-title">✓ {appliedCoupon.label}</p>
                          <p className="co-coupon-applied-sub">You save {formatPrice(appliedCoupon.amount)}</p>
                        </div>
                        <button className="co-coupon-remove" onClick={removeCoupon} type="button">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="co-coupon-row">
                        <input
                          className="co-input co-coupon-input"
                          placeholder="ENTER CODE"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                          aria-label="Coupon code"
                        />
                        <button
                          className="co-coupon-btn"
                          onClick={applyCoupon}
                          disabled={couponApplying}
                          type="button"
                        >
                          {couponApplying ? '…' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="co-coupon-error">{couponError}</p>}
                  </div>

                  {/* Security notice */}
                  <div className="co-secure-notice">
                    <span>{payMethod === 'cod' ? '🚚' : '🔒'}</span>
                    <p>
                      {payMethod === 'cod'
                        ? <><strong>Cash on Delivery</strong> — Pay {formatPrice(grandTotal)} when your order arrives.</>
                        : <><strong>Secure payment</strong> via Razorpay. Your card details are never stored by us.</>}
                    </p>
                  </div>

                  {/* CTA — desktop (mobile uses sticky bar below) */}
                  <PayBtn className="co-pay-btn co-pay-btn--form" />

                  <div className="co-trust-row">
                    {[
                      { i: '🔒', l: 'SSL Encrypted' },
                      { i: '🚚', l: 'Free Shipping'  },
                      { i: '✦',  l: 'Authentic'      },
                    ].map(({ i, l }) => (
                      <div key={l} className="co-trust-item"><span>{i}</span>{l}</div>
                    ))}
                  </div>

                  <p className="co-terms">
                    By completing your purchase you agree to our{' '}
                    <button className="co-terms-link" type="button">Terms &amp; Conditions</button>
                    {' '}and{' '}
                    <button className="co-terms-link" type="button">Refund Policy</button>.
                  </p>

                  {/* Safe-area spacer for mobile sticky bar */}
                  <div className="co-form-bottom-spacer" aria-hidden="true" />
                </div>

                {/* ORDER SUMMARY SIDE — desktop only */}
                <aside className="co-order-side" aria-label="Order summary">
                  <div className="co-order-card">
                    <h2 className="co-order-title">
                      Order Summary
                      <span className="co-order-count">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </h2>
                    {items.map((item: any) => (
                      <div key={`${item.productId}-${item.variantId}`} className="co-order-item">
                        <div className="co-order-thumb">
                          <span className="co-order-initials">
                            {item.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="co-order-info">
                          <p className="co-order-name">{item.name}</p>
                          <p className="co-order-meta">Size {item.size} · Qty {item.quantity}</p>
                        </div>
                        <span className="co-order-price">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="co-order-totals">
                      <div className="co-order-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                      {discount > 0 && (
                        <div className="co-order-row co-order-row--disc">
                          <span>Coupon discount</span><span>− {formatPrice(discount)}</span>
                        </div>
                      )}
                      <div className="co-order-row">
                        <span>Shipping</span>
                        <span className={shipping === 0 ? 'co-free' : ''}>
                          {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                        </span>
                      </div>
                      <div className="co-order-row">
                        <span>GST (included)</span>
                        <span>{formatPrice(Math.round(grandTotal * 0.05))}</span>
                      </div>
                      <div className="co-order-final">
                        <span>Total</span><strong>{formatPrice(grandTotal)}</strong>
                      </div>
                    </div>
                    <div className="co-delivery-box">
                      <p className="co-delivery-label">Delivery Estimate</p>
                      <p className="co-delivery-val">Standard: <strong>4–8 business days</strong></p>
                    </div>
                    <PayBtn className="co-pay-btn co-pay-btn--sidebar" />
                  </div>
                </aside>
              </div>

              {/* ── MOBILE STICKY PAY BAR ─────────────────────────────── */}
              <div className="co-sticky-bar">
                <div className="co-sticky-info">
                  <span className="co-sticky-items">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                  <strong className="co-sticky-total">{formatPrice(grandTotal)}</strong>
                </div>
                <button
                  className="co-sticky-btn"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  type="button"
                >
                  {isProcessing
                    ? <span className="co-spinner-wrap">
                        <span className="co-spinner co-spinner--dark" />Processing…
                      </span>
                    : payMethod === 'cod' ? 'Place Order →' : 'Pay Securely →'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Razorpay SDK loader (singleton promise — script fetched only once) ─────────

let _razorpayScriptPromise: Promise<void> | null = null;

async function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') return;
  if (_razorpayScriptPromise) return _razorpayScriptPromise;

  _razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      if (typeof window.Razorpay !== 'undefined') { resolve(); return; }
      const poll = setInterval(() => {
        if (typeof window.Razorpay !== 'undefined') { clearInterval(poll); resolve(); }
      }, 50);
      setTimeout(() => {
        clearInterval(poll);
        reject(new Error('Razorpay SDK load timeout'));
      }, 10_000);
      return;
    }

    const script   = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve();
    script.onerror = () => {
      _razorpayScriptPromise = null;
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.head.appendChild(script);
  });

  return _razorpayScriptPromise;
}
