'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { formatPrice, calcShipping } from '@/lib/utils';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';
import { checkPincode, type PincodeResult } from '@/lib/pincode';

// ── Types ────────────────────────────────────────────────────────
interface Address {
  name: string; phone: string; email: string;
  line1: string; line2: string; city: string; state: string; pincode: string;
}

type PayMethod = 'online' | 'cod';

// ── Coupons — validated server-side via /api/coupons/validate ──────────────
type CouponData = { type: 'percent' | 'flat'; value: number; label: string; min_order?: number };

function applyDiscount(subtotal: number, coupon: CouponData | null) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') return Math.round(subtotal * coupon.value / 100);
  return Math.min(coupon.value, subtotal);
}

// ── Helpers ──────────────────────────────────────────────────────
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Other',
];

const FormField = React.memo(function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="checkout-field">
      <label>
        {label}
        {required && <span style={{ color: 'var(--sage)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--blush)', marginTop: 4 }}>{error}</div>}
    </div>
  );
});

// Memoized input wrapper — keeps the <input> from remounting when parent re-renders
// due to fieldErrors or other state changes. value/onChange must be stable refs.
const StableInput = React.memo(function StableInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input {...props} />;
});

const StableSelect = React.memo(function StableSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
) {
  return <select {...props}>{props.children}</select>;
});

// ── Order Success Screen ─────────────────────────────────────────
function OrderSuccess({ orderId, method, name, onClose, onTrack }: {
  orderId: string; method: PayMethod; name: string; onClose: () => void; onTrack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '80dvh', padding: '40px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto',
      }}
    >
      {/* Animated checkmark */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(195,206,148,0.1)', border: '2px solid rgba(195,206,148,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28, fontSize: 32,
      }}>✦</div>

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: '0.06em', color: 'var(--white)', marginBottom: 10 }}>
        ORDER PLACED!
      </div>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: 28 }}>
        Thank you, <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{name}</strong>!<br />
        Your order <strong style={{ color: 'var(--sage)' }}>#{orderId}</strong> has been confirmed.
        {method === 'cod'
          ? ' Please keep the exact amount ready at the time of delivery.'
          : ' A confirmation will be sent to your email shortly.'}
      </p>

      {/* Steps */}
      <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
          What happens next
        </div>
        {[
          { icon: '📧', text: 'Order confirmation sent to your email', done: true },
          { icon: '📦', text: 'We pack & dispatch within 24 hours', done: false },
          { icon: '🚚', text: 'Delivery in 4–8 business days', done: false },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <span style={{ fontSize: 12, color: s.done ? 'var(--sage)' : 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%', flexWrap: 'wrap' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, minWidth: 140, height: 48, background: 'var(--white)', color: 'var(--black)',
            border: 'none', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
        >
          Continue Shopping
        </button>
        <button
          onClick={onTrack}
          style={{
            flex: 1, minWidth: 140, height: 48, background: 'none', color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'var(--font-body)', fontSize: 11,
            fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          Track Order
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function CheckoutOverlay() {
  const { items, total, clearCart } = useCartStore();
  const { isCheckoutOpen, closeCheckout, addToast, openOrderTracking } = useUIStore();

  useEscapeKey(closeCheckout, isCheckoutOpen);
  useOverlayHistory(isCheckoutOpen, closeCheckout);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Address, string>>>({});

  // Payment method
  const [payMethod, setPayMethod] = useState<PayMethod>('online');

  // Coupon
  const [couponInput,       setCouponInput]       = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedCoupon,     setAppliedCoupon]     = useState<CouponData | null>(null);
  const [couponError,       setCouponError]       = useState('');
  const [couponApplying,    setCouponApplying]    = useState(false);

  // ── Uncontrolled address fields ────────────────────────────────────
  // DEFINITIVE FIX for iOS/Android keyboard dismissal.
  //
  // Root cause of all previous failures: any `value` prop on a controlled
  // input causes React to write to input.value in the DOM on every render.
  // iOS interprets that DOM write as the input being reset → keyboard gone.
  //
  // Solution: inputs are UNCONTROLLED (no `value` prop, only `defaultValue`).
  // React never touches the DOM value while the user is typing.
  // Values are read from DOM refs — always current, zero re-renders.
  //
  // address state is only updated on blur and on submit — never while typing.
  const domRefs = useRef<Partial<Record<keyof Address, HTMLInputElement | HTMLSelectElement>>>({});

  // Read current values straight from the DOM — no stale state.
  const readAddress = useCallback((): Address => ({
    name:    (domRefs.current.name    as HTMLInputElement)?.value   ?? '',
    phone:   (domRefs.current.phone   as HTMLInputElement)?.value   ?? '',
    email:   (domRefs.current.email   as HTMLInputElement)?.value   ?? '',
    line1:   (domRefs.current.line1   as HTMLInputElement)?.value   ?? '',
    line2:   (domRefs.current.line2   as HTMLInputElement)?.value   ?? '',
    city:    (domRefs.current.city    as HTMLInputElement)?.value   ?? '',
    state:   (domRefs.current.state   as HTMLSelectElement)?.value  ?? '',
    pincode: (domRefs.current.pincode as HTMLInputElement)?.value   ?? '',
  }), []);

  // Stable ref callback factory — same function reference per key, forever.
  const refCallbacks = useRef<Partial<Record<keyof Address, (el: HTMLInputElement | HTMLSelectElement | null) => void>>>({});
  function fieldRef(key: keyof Address) {
    if (!refCallbacks.current[key]) {
      refCallbacks.current[key] = (el) => { if (el) domRefs.current[key] = el; };
    }
    return refCallbacks.current[key]!;
  }

  // Pincode lookup fires on blur of pincode field, not on every keystroke.
  const [pincodeValue, setPincodeValue] = useState('');
  const [pincodeResult, setPincodeResult] = useState<PincodeResult>({ status: 'idle' });
  useEffect(() => {
    if (pincodeValue.length !== 6) { setPincodeResult({ status: 'idle' }); return; }
    setPincodeResult({ status: 'loading' });
    checkPincode(pincodeValue).then(setPincodeResult);
  }, [pincodeValue]);

  // Processing / success
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; method: PayMethod } | null>(null);

  const subtotal     = useMemo(() => total(), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const shipping     = useMemo(() => calcShipping(subtotal - applyDiscount(subtotal, appliedCoupon)), [subtotal, appliedCoupon]);
  const discount     = useMemo(() => applyDiscount(subtotal, appliedCoupon), [subtotal, appliedCoupon]);
  const grandTotal   = useMemo(() => Math.max(0, subtotal + shipping - discount), [subtotal, shipping, discount]);

  // field() returns props for uncontrolled inputs.
  // No `value` prop = React never writes to the DOM = keyboard stays up.
  function field(key: keyof Address) {
    const base = {
      ref: fieldRef(key),
      defaultValue: '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        // Ensure ref value is always in sync (fixes autofill not triggering blur)
        if (domRefs.current[key]) {
          (domRefs.current[key] as HTMLInputElement).value = e.target.value;
        }
        setFieldErrors(prev => ({ ...prev, [key]: undefined }));
        if (key === 'pincode') setPincodeValue(e.target.value);
      },
      onBlur: () => {
        setFieldErrors(prev => ({ ...prev, [key]: undefined }));
        if (key === 'pincode') {
          const val = (domRefs.current.pincode as HTMLInputElement)?.value ?? '';
          setPincodeValue(val);
        }
      },
    };
    return base;
  }

  const validate = useCallback(() => {
    const a = readAddress();
    const errs: Partial<Record<keyof Address, string>> = {};
    const req: (keyof Address)[] = ['name', 'phone', 'email', 'line1', 'city', 'state', 'pincode'];
    req.forEach(k => { if (!a[k].trim()) errs[k] = 'Required'; });
    if (a.phone && !/^\d{10}$/.test(a.phone)) errs.phone = 'Enter a valid 10-digit number';
    if (a.email && !a.email.includes('@')) errs.email = 'Enter a valid email address';
    if (a.pincode && !/^\d{6}$/.test(a.pincode)) errs.pincode = 'Enter a valid 6-digit pincode';
    if (a.pincode.length === 6 && pincodeResult.status === 'invalid') errs.pincode = pincodeResult.error ?? 'Invalid pincode';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [readAddress, pincodeResult]);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError('Enter a coupon code'); return; }
    setCouponApplying(true); setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (data.valid && data.coupon) {
        const c = data.coupon;
        const coupon: CouponData = {
          type: c.type,
          value: c.value,
          label: c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`,
          min_order: c.min_order,
        };
        setAppliedCoupon(coupon);
        setAppliedCouponCode(code);
        setCouponInput('');
        addToast('✓', `Coupon applied — ${coupon.label}`);
      } else {
        setCouponError(data.error ?? 'Invalid or expired coupon code');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    }
    setCouponApplying(false);
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponError(''); };

  const handlePayment = async () => {
    if (!validate()) {
      addToast('⚠', 'Please fix the errors above');
      return;
    }
    if (items.length === 0) { addToast('⚠', 'Your cart is empty'); return; }

    // Snapshot address values from DOM refs at submit time
    const address = readAddress();

    setIsProcessing(true);

    if (payMethod === 'cod') {
      // COD flow — save order to DB, skip payment gateway
      try {
        const codRes = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, price: i.price })),
            shippingAddress: { ...address, country: 'India' },
            amount: subtotal,
            couponCode: appliedCoupon ? appliedCouponCode : undefined,
            paymentMethod: 'cod',
          }),
        });
        if (!codRes.ok) {
          const errData = await codRes.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? 'Failed to place COD order');
        }
        const { orderId } = await codRes.json();
        clearCart();
        setSuccessOrder({ id: orderId, method: 'cod' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not place order. Please try again.';
        addToast('✕', msg);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Online payment flow — Cashfree
    // NOTE: We use a flag to prevent the outer finally from resetting isProcessing
    // when the Cashfree modal opens successfully (callbacks handle it then).
    let modalOpened = false;
    try {
      const orderRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, price: i.price })),
          shippingAddress: { ...address, country: 'India' },
          amount: subtotal,
          couponCode: appliedCoupon ? appliedCouponCode : undefined,
          paymentMethod: 'online',
        }),
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? 'Failed to create order');
      }
      const { paymentSessionId, orderId } = await orderRes.json() as { paymentSessionId: string; orderId: string; total: number };

      if (!paymentSessionId) throw new Error('No payment session returned');

      // Load Cashfree JS SDK from CDN
      await loadCashfreeScript();

      const cashfree = new window.Cashfree({
        mode: (process.env.NEXT_PUBLIC_CASHFREE_ENV ?? 'sandbox') as 'sandbox' | 'production',
      });

      modalOpened = true; // signal: finally block won't reset isProcessing

      // Cashfree v3 SDK — checkout() returns a Promise that resolves when the modal closes
      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      // result.paymentDetails is present on success/failure inside the modal
      // result.redirect is true if the SDK is doing a page redirect (non-modal fallback)
      if (result?.redirect) {
        // SDK is redirecting to return_url — nothing to do here, page will navigate
        return;
      }

      const status = result?.paymentDetails?.payment_status;

      if (status === 'SUCCESS') {
        // Optimistically verify server-side to confirm webhook processed
        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });
          const verifyData = await verifyRes.json() as { paymentStatus?: string };
          if (verifyRes.ok && verifyData.paymentStatus === 'paid') {
            clearCart();
            setSuccessOrder({ id: orderId, method: 'online' });
          } else {
            addToast('✕', 'Payment verification failed. Contact support with order ID: ' + orderId);
          }
        } catch {
          addToast('✕', 'Could not verify payment. Contact support with order ID: ' + orderId);
        }
      } else if (status === 'FAILED') {
        addToast('✕', 'Payment failed. Please try again.');
      } else {
        // User closed modal without completing payment — silent, no toast
      }

      setIsProcessing(false);
      return;
    } catch (err) {
      console.error('[payment]', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      addToast('✕', msg);
    } finally {
      // Reset isProcessing if modal never opened (error before checkout() call)
      if (!modalOpened) setIsProcessing(false);
    }
  };

  const handleClose = () => {
    closeCheckout();
    // Reset after animation
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

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <motion.div
          className="checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* SUCCESS SCREEN */}
          {successOrder ? (
            <>
              <div className="checkout-header">
                <div className="checkout-header-top">
                  <span className="checkout-logo">RARE EASE</span>
                </div>
              </div>
              <OrderSuccess
                orderId={successOrder.id}
                method={successOrder.method}
                name={(domRefs.current.name as HTMLInputElement)?.value ?? ''}
                onClose={handleClose}
                onTrack={() => { handleClose(); setTimeout(() => openOrderTracking(), 450); }}
              />
            </>
          ) : (
            <>
              {/* ── HEADER ── */}
              <div className="checkout-header">
                <div className="checkout-header-top">
                  <span className="checkout-logo">RARE EASE</span>
                  <button className="checkout-back-btn" onClick={handleClose}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Back to Cart</span>
                  </button>
                </div>
                <div className="checkout-steps">
                  {[
                    { num: '✓', label: 'Cart', done: true },
                    { num: '2', label: 'Details', active: true },
                    { num: '3', label: 'Payment', active: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {i > 0 && <div className="checkout-step-divider" />}
                      <div className="checkout-step-item">
                        <span className={`checkout-step-num${s.done ? ' checkout-step-num--done' : ''}${s.active ? ' checkout-step-num--active' : ''}`}>{s.num}</span>
                        <span className={`checkout-step-label${s.active ? ' checkout-step-label--active' : ''}`}>{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── BODY ── */}
              <div className="checkout-body">
                <div className="checkout-form-side">

                  {/* Contact Info */}
                  <div className="form-section-header">
                    <div className="form-section-num">1</div>
                    <div className="form-section-title">Contact Info</div>
                  </div>
                  <div className="checkout-field-row" style={{ display: 'grid' }}>
                    <FormField label="Full Name" required error={fieldErrors.name}>
                      <StableInput placeholder="Aryan Kumar" className="checkout-field-input" autoComplete="name" autoCorrect="off" spellCheck={false} {...field('name')} />
                    </FormField>
                    <FormField label="Phone" required error={fieldErrors.phone}>
                      <StableInput placeholder="9876543210" type="tel" inputMode="tel" className="checkout-field-input" autoComplete="tel-national" {...field('phone')} />
                    </FormField>
                  </div>
                  <FormField label="Email Address" required error={fieldErrors.email}>
                    <StableInput placeholder="you@example.com" type="email" inputMode="email" className="checkout-field-input" autoComplete="email" autoCapitalize="none" autoCorrect="off" {...field('email')} />
                  </FormField>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

                  {/* Delivery Address */}
                  <div className="form-section-header">
                    <div className="form-section-num">2</div>
                    <div className="form-section-title">Delivery Address</div>
                  </div>
                  <FormField label="Address Line 1" required error={fieldErrors.line1}>
                    <StableInput placeholder="House / Flat / Building, Street" className="checkout-field-input" autoComplete="address-line1" {...field('line1')} />
                  </FormField>
                  <FormField label="Address Line 2" error={fieldErrors.line2}>
                    <StableInput placeholder="Landmark, Area (optional)" className="checkout-field-input" autoComplete="address-line2" {...field('line2')} />
                  </FormField>
                  <div className="checkout-field-row" style={{ display: 'grid' }}>
                    <FormField label="City" required error={fieldErrors.city}>
                      <StableInput placeholder="Bengaluru" className="checkout-field-input" autoComplete="address-level2" autoCorrect="off" {...field('city')} />
                    </FormField>
                    <FormField label="Pincode" required error={fieldErrors.pincode}>
                      <div style={{ position: 'relative' }}>
                        <StableInput
                          placeholder="560001" type="text" inputMode="numeric" maxLength={6}
                          className="checkout-field-input"
                          autoComplete="postal-code"
                          {...field('pincode')}
                          style={{ paddingRight: 36 }}
                        />
                        {pincodeResult.status === 'loading' && (
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--mid-gray)' }}>…</span>
                        )}
                        {(pincodeResult.status === 'valid' || pincodeResult.status === 'invalid') && (
                          <span style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 14, color: pincodeResult.status === 'valid' ? 'var(--sage)' : 'var(--blush)',
                          }}>
                            {pincodeResult.status === 'valid' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      {pincodeResult.status === 'valid' && pincodeResult.district && (
                        <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 4, letterSpacing: '0.05em' }}>
                          ✓ {pincodeResult.district}, {pincodeResult.state}
                        </div>
                      )}
                    </FormField>
                  </div>
                  <FormField label="State" required error={fieldErrors.state}>
                    <StableSelect className="checkout-field-input" {...field('state')}>
                      <option value="" style={{ background: '#0d0d0d', color: '#f5f5f5' }}>Select state</option>
                      {STATES.map(s => <option key={s} value={s} style={{ background: '#0d0d0d', color: '#f5f5f5' }}>{s}</option>)}
                    </StableSelect>
                  </FormField>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

                  {/* Payment Method */}
                  <div className="form-section-header">
                    <div className="form-section-num">3</div>
                    <div className="form-section-title">Payment Method</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {([
                      { id: 'online' as PayMethod, icon: '💳', title: 'Pay Online', sub: 'Cards, UPI, Net Banking, Wallets' },
                      { id: 'cod'    as PayMethod, icon: '💵', title: 'Cash on Delivery', sub: grandTotal > 2000 ? 'Not available above ₹2,000' : 'Pay when your order arrives' },
                    ] as const).map(opt => {
                      const codBlocked = opt.id === 'cod' && grandTotal > 2000;
                      return (
                      <button
                        key={opt.id}
                        onClick={() => !codBlocked && setPayMethod(opt.id)}
                        disabled={codBlocked}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                          padding: '14px 16px', textAlign: 'left',
                          background: payMethod === opt.id ? 'rgba(195,206,148,0.07)' : codBlocked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${payMethod === opt.id ? 'rgba(195,206,148,0.4)' : codBlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                          cursor: codBlocked ? 'not-allowed' : 'pointer',
                          opacity: codBlocked ? 0.45 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{opt.icon}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: payMethod === opt.id ? 'var(--sage)' : codBlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>{opt.title}</span>
                        <span style={{ fontSize: 10, color: codBlocked ? 'var(--blush)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>{opt.sub}</span>
                      </button>
                      );
                    })}
                  </div>

                  {/* COD notice */}
                  {payMethod === 'cod' && (
                    <div style={{ padding: '12px 16px', background: 'rgba(244,162,90,0.07)', border: '1px solid rgba(244,162,90,0.2)', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                      💡 <strong style={{ color: 'rgba(244,162,90,0.9)' }}>Note:</strong> COD orders may take slightly longer to process. Please keep the exact amount ready. COD is only available for orders up to ₹2,000.
                    </div>
                  )}

                  {/* Coupon */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 24px' }} />
                  <div className="form-section-header" style={{ marginBottom: 12 }}>
                    <div className="form-section-num">4</div>
                    <div className="form-section-title">Coupon Code</div>
                  </div>

                  {appliedCoupon ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(195,206,148,0.07)', border: '1px solid rgba(195,206,148,0.3)', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage)', letterSpacing: '0.08em' }}>✓ Coupon applied — {appliedCoupon.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>You save {formatPrice(discount)}</div>
                      </div>
                      <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'underline' }}>Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input
                        className="checkout-field-input"
                        style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12 }}
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponApplying}
                        style={{
                          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: 10,
                          fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                          padding: '0 16px', cursor: 'pointer', whiteSpace: 'nowrap',
                          transition: 'all 0.2s', minWidth: 80,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                      >
                        {couponApplying ? '…' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <div style={{ fontSize: 11, color: 'var(--blush)', marginBottom: 16, letterSpacing: '0.03em' }}>{couponError}</div>}

                  {/* Security notice */}
                  <div style={{ marginTop: 20, padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(195,206,148,0.1)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{payMethod === 'cod' ? '🚚' : '🔒'}</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>
                      {payMethod === 'cod'
                        ? <><strong style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Cash on Delivery</strong> — Pay {formatPrice(grandTotal)} when your order arrives. No online payment required.</>
                        : <><strong style={{ color: 'var(--sage)', fontWeight: 500 }}>Secure payment</strong> via Cashfree. Your card details are never stored by us.</>}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    className="checkout-pay-btn"
                    onClick={handlePayment}
                    disabled={isProcessing}
                    style={{ marginTop: 20, opacity: isProcessing ? 0.65 : 1 }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.4)', borderTopColor: 'var(--black)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        Processing…
                      </span>
                    ) : payMethod === 'cod'
                      ? `Place COD Order — ${formatPrice(grandTotal)} →`
                      : `Pay ${formatPrice(grandTotal)} Securely →`
                    }
                  </button>

                  {/* Trust row */}
                  <div className="checkout-trust-row">
                    {[{ icon: '🔒', label: 'SSL Encrypted' }, { icon: '🚚', label: 'Free Shipping' }, { icon: '✦', label: 'Authentic' }].map(({ icon, label }) => (
                      <div key={label} className="checkout-trust-item">
                        <span className="checkout-trust-icon">{icon}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── ORDER SUMMARY ── */}
                <div className="checkout-order-side">
                  <div className="checkout-order-title">
                    Order Summary
                    <span style={{ marginLeft: 8, color: 'var(--sage)' }}>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  </div>

                  {items.map(item => (
                    <div key={`${item.productId}-${item.variantId}`} className="checkout-order-item">
                      <div className="checkout-order-thumb">
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#111,#1c1c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'rgba(255,255,255,0.14)' }}>
                            {item.name.split(' ').map((w: string) => w[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="checkout-order-item-name">{item.name}</div>
                        <div className="checkout-order-item-meta">Size {item.size} · Qty {item.quantity}</div>
                      </div>
                      <div className="checkout-order-item-price">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}

                  <div className="checkout-order-total">
                    <div className="checkout-order-total-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                    {discount > 0 && (
                      <div className="checkout-order-total-row" style={{ color: 'var(--sage)' }}>
                        <span>Coupon Discount</span>
                        <span>− {formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="checkout-order-total-row">
                      <span>Shipping</span>
                      <span style={{ color: shipping === 0 ? 'var(--sage)' : 'var(--white)' }}>
                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                      </span>
                    </div>
                    <div className="checkout-order-total-row">
                      <span>GST (included)</span>
                      <span>{formatPrice(Math.round(grandTotal * 0.05))}</span>
                    </div>
                    <div className="checkout-order-total-final">
                      <span>Total</span>
                      <strong>{formatPrice(grandTotal)}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid-gray)', marginBottom: 6 }}>Delivery Estimate</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                      Standard: <strong style={{ color: 'var(--white)' }}>4–8 business days</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.8 }}>
                    By completing your purchase you agree to our{' '}
                    <span style={{ color: 'var(--mid-gray)', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span>
                    {' '}and{' '}
                    <span style={{ color: 'var(--mid-gray)', textDecoration: 'underline', cursor: 'pointer' }}>Refund Policy</span>.
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Load Cashfree JS SDK from CDN — cached so concurrent calls don't double-insert the script tag
let _cashfreeScriptPromise: Promise<void> | null = null;
async function loadCashfreeScript(): Promise<void> {
  if (typeof window !== 'undefined' && typeof window.Cashfree !== 'undefined') return;
  if (_cashfreeScriptPromise) return _cashfreeScriptPromise;
  _cashfreeScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload  = () => resolve();
    script.onerror = () => { _cashfreeScriptPromise = null; reject(new Error('Failed to load Cashfree SDK')); };
    document.head.appendChild(script);
  });
  return _cashfreeScriptPromise;
}