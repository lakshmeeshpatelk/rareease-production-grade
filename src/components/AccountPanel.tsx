'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';
import { getClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthPhone from './AuthPhone';

export type PhaseType = 'choose' | 'phone-input' | 'phone-otp' | 'email-input' | 'signed-in' | 'orders' | 'addresses' | 'reviews' | 'sizeGuide';

interface SavedAddress {
  id: string; label: string; name: string; line1: string;
  city: string; state: string; pincode: string; phone: string;
  isDefault: boolean;
}

const MENU_ITEMS = [
  { label: 'My Orders',       icon: '📦', action: 'orders'    },
  { label: 'Track a Package', icon: '🚚', action: 'track'     },
  { label: 'Size Guide',      icon: '📏', action: 'sizeGuide' },
  { label: 'Notifications',   icon: '🔔', action: 'notif'     },
  { label: 'My Reviews',      icon: '★',  action: 'reviews'   },
  { label: 'Saved Addresses', icon: '📍', action: 'addresses' },
];

/* ─── Small reusable input ─────────────────────────────────────── */
const AuthInput = React.memo(function AuthInput({ type = 'text', value, onChange, placeholder, autoFocus = false, maxLength, prefix }: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; maxLength?: number; prefix?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [autoFocus]);
  // Use CSS :focus-within instead of JS onFocus/onBlur to avoid triggering
  // layout mutations on every keystroke which causes Android keyboard to flicker
  return (
    <div
      ref={wrapRef}
      className="auth-input-wrap"
    >
      {prefix && (
        <span style={{ padding: '0 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
          {prefix}
        </span>
      )}
      <input
        ref={ref} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        inputMode={type === 'tel' ? 'numeric' : type === 'email' ? 'email' : 'text'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--white)', padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 'max(16px, 13px)', WebkitAppearance: 'none' } as React.CSSProperties}
      />
    </div>
  );
});

/* ─── Primary CTA button ────────────────────────────────────────── */
function AuthBtn({ label, loading, onClick, disabled }: { label: string; loading?: boolean; onClick: () => void; disabled?: boolean; }) {
  return (
    <button
      onClick={onClick} disabled={loading || disabled}
      style={{ width: '100%', minHeight: 48, background: 'var(--white)', color: 'var(--black)', border: 'none', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: loading || disabled ? 'not-allowed' : 'pointer', opacity: loading || disabled ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.2s' } as React.CSSProperties}
      onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = 'var(--sage)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; }}
    >
      {loading
        ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : label}
    </button>
  );
}

/* ─── OTP digit boxes ───────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void; }) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const handleKey   = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs[i-1].current?.focus(); };
  const handleChange = (i: number, ch: string) => {
    const d = ch.replace(/\D/, '');
    const arr = value.split(''); arr[i] = d;
    onChange(arr.join('').slice(0, 6));
    if (d && i < 5) refs[i+1].current?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    onChange(p);
    refs[Math.min(p.length, 5)].current?.focus();
  };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={`otp-${i}`} ref={refs[i]} type="tel" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
          style={{ width: 44, height: 52, textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid ${value[i] ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`, color: 'var(--white)', fontSize: 22, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', outline: 'none', transition: 'border-color 0.2s' } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ─── Google logo SVG ───────────────────────────────────────────── */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.3 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
  </svg>
);

/* ─── Divider ───────────────────────────────────────────────────── */
const OrDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>or</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
  </div>
);

/* ─── Back button ───────────────────────────────────────────────── */
const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
    ← Back
  </button>
);

/* ─── Social option button ──────────────────────────────────────── */
const SocialBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', minHeight: 52, padding: '0 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, marginBottom: 10, transition: 'border-color 0.2s, background 0.2s' } as React.CSSProperties}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
  >
    {icon}{label}
  </button>
);

/* ─── Field label ───────────────────────────────────────────────── */
const FieldLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 7 }}>
    {text}{required && <span style={{ color: 'var(--sage)', marginLeft: 3 }}>*</span>}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function AccountPanel() {
  const { isAccountOpen, closeAccount, openOrderTracking, openWishlist, addToast, toggleNotifications } = useUIStore();
  useEscapeKey(closeAccount);
  useOverlayHistory(isAccountOpen, closeAccount);
  const { productIds } = useWishlistStore();

  const [mounted,    setMounted]    = useState(false);
  const [phase,      setPhase]      = useState<PhaseType>('choose');
  const [loading,    setLoading]    = useState(false);
  const [user,       setUser]       = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Phone
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpError, setOtpError] = useState('');

  // Email
  const [email,    setEmail]    = useState('');
  const [linkSent, setLinkSent] = useState(false);

  // My Orders / Return sub-views
  const [ordersView, setOrdersView] = useState<'list' | 'return'>('list');
  const [returnOrder, setReturnOrder] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  // Address Book
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<import('@/types').Order[]>([]);

  useEffect(() => {
    if (!user) { setAddresses([]); setMyOrders([]); return; }
    import('@/lib/db').then(({ fetchUserAddresses }) => {
      fetchUserAddresses(user.id).then(data => {
        setAddresses(data.map(a => ({
          id: a.id, label: a.label ?? '', name: a.name, line1: a.line1,
          city: a.city, state: a.state ?? '', pincode: a.pincode,
          phone: a.phone ?? '', isDefault: a.is_default,
        })));
      });
    });
    import('@/store/wishlistStore').then(({ useWishlistStore }) => {
      useWishlistStore.getState().syncFromSupabase(user.id);
    });
    loadOrders();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    const { fetchUserOrders } = await import('@/lib/db');
    const data = await fetchUserOrders(user.id);
    setMyOrders(data);
    setOrdersLoading(false);
  };

  const [addingAddress,  setAddingAddress]  = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addrForm, setAddrForm] = useState({ label:'', name:'', line1:'', city:'', state:'', pincode:'', phone:'' });

  useEffect(() => { setMounted(true); }, []);
  // Load orders whenever the orders phase is entered (stable, not inside PhaseOrders
  // which gets redefined on every render and causes remount loops)
  useEffect(() => { if (phase === 'orders' && user) loadOrders(); }, [phase, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const sb = getClient() as any;
      sb.auth.getUser().then(({ data }: any) => {
        if (data?.user) { setUser(data.user); setPhase('signed-in'); }
      }).catch(() => {});
      const { data } = sb.auth.onAuthStateChange((_e: any, session: any) => {
        const u = session?.user ?? null;
        setUser(u);
        setPhase(u ? 'signed-in' : 'choose');
      });
      subscription = data.subscription;
    } catch (err) {
      console.error('[AccountPanel] auth listener failed:', err);
    }
    return () => { subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isAccountOpen) {
      const t = setTimeout(() => {
        if (!user) setPhase('choose');
        setPhone(''); setOtp(''); setEmail('');
        setLinkSent(false); setOtpError(''); setLoading(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isAccountOpen, user]);

  const handleItem = (action: string) => {
    if (action === 'track')     { closeAccount(); openOrderTracking(); }
    if (action === 'notif')     { closeAccount(); toggleNotifications(); }
    if (action === 'orders')    { if (!user) { setPhase('choose'); return; } setPhase('orders' as PhaseType); }
    if (action === 'addresses') { setPhase('addresses' as PhaseType); }
    if (action === 'reviews')   { if (!user) { setPhase('choose'); return; } setPhase('reviews' as PhaseType); }
    if (action === 'sizeGuide') { setPhase('sizeGuide' as PhaseType); }
  };

  /* ── Phone: send OTP ── */
  const sendPhoneOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { addToast('⚠', 'Enter a valid 10-digit number'); return; }
    setLoading(true);
    const { error } = await (getClient() as any).auth.signInWithOtp({
      phone: `+91${cleaned}`,
      options: {},
    });
    setLoading(false);
    if (error) { addToast('✕', error.message ?? 'Could not send OTP'); return; }
    setPhase('phone-otp');
  };

  /* ── Phone: verify OTP ── */
  const verifyPhoneOtp = async () => {
    if (otp.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setLoading(true); setOtpError('');
    const cleaned = phone.replace(/\D/g, '');
    const { data, error } = await (getClient() as any).auth.verifyOtp({
      phone: `+91${cleaned}`, token: otp, type: 'sms',
    });
    setLoading(false);
    if (error) { setOtpError('Incorrect code — try again'); setOtp(''); return; }
    if (data?.user) {
      setUser(data.user); setPhase('signed-in');
      addToast('✓', 'Signed in successfully!');
    }
  };

  /* ── Email: magic link ── */
  const sendEmailLink = async () => {
    if (!email.trim() || !email.includes('@')) { addToast('⚠', 'Enter a valid email'); return; }
    setLoading(true);
    const { error } = await (getClient() as any).auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',
        data: {},
      },
    });
    setLoading(false);
    if (error) { addToast('✕', error.message ?? 'Could not send link'); return; }
    setLinkSent(true);
  };

  /* ── Google OAuth ── */
  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await (getClient() as any).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '' },
    });
    if (error) { setLoading(false); addToast('✕', error.message ?? 'Google sign-in failed'); }
  };

  /* ── Sign out ── */
  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await (getClient() as any).auth.signOut();
    setSigningOut(false);
    if (error) { addToast('✕', 'Sign out failed'); return; }
    setUser(null); setPhase('choose'); closeAccount();
    addToast('✓', 'Signed out successfully.');
  };

  if (!mounted) return null;

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? user?.phone ?? 'Member';
  const displaySub  = user?.email ?? (user?.phone ? `+91 ${user.phone.slice(3)}` : '');
  const initials    = displayName.split(' ').map((w: string) => w[0]?.toUpperCase()).slice(0, 2).join('');

  /* ══════════════════════════════════════════════════════════════════
     PHASE RENDERERS — all use scrollable flex column, no fixed heights
  ══════════════════════════════════════════════════════════════════ */

  const PhaseChoose = () => (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.1em', color: 'var(--white)', marginBottom: 5 }}>
          WELCOME
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0 }}>
          Sign in or create an account to access orders, wishlist and exclusive drops
        </p>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', minHeight: 52, padding: '0 20px', background: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 10, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s, box-shadow 0.2s' } as React.CSSProperties}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(195,206,148,0.6)'; }}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        <GoogleLogo />
        Continue with Google
      </button>

      <OrDivider />

      <SocialBtn
        onClick={() => setPhase('phone-input')}
        label='Continue with Mobile Number'
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        }
      />

      <SocialBtn
        onClick={() => setPhase('email-input')}
        label='Continue with Email'
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        }
      />

      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', lineHeight: 1.7, marginTop: 24, paddingTop: 0 }}>
        By continuing you agree to our Terms & Privacy Policy
      </p>
    </div>
  );

  const PhasePhoneInput = React.memo(function PhasePhoneInput({ phone, setPhone, loading, sendPhoneOtp, setPhase }: {
    phone: string; setPhone: (v: string) => void; loading: boolean;
    sendPhoneOtp: () => void; setPhase: (p: PhaseType) => void;
  }) {
    return (
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <BackBtn onClick={() => setPhase('choose')} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
          MOBILE NUMBER
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.6, margin: '0 0 24px' }}>
          We&apos;ll send a 6-digit OTP to verify your number
        </p>

        <div style={{ marginBottom: 6 }}>
          <FieldLabel text="Mobile Number" required />
          <AuthInput type="tel" value={phone} onChange={setPhone} placeholder="98765 43210" prefix="+91" autoFocus maxLength={10} />
        </div>

        <div style={{ height: 20 }} />
        <AuthBtn label="Send OTP →" loading={loading} onClick={sendPhoneOtp} />

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 16 }}>
          Standard SMS charges may apply
        </p>
      </div>
    );
  });

  const PhasePhoneOtp = () => (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      <BackBtn onClick={() => { setPhase('phone-input'); setOtp(''); setOtpError(''); }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
        ENTER OTP
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 28, lineHeight: 1.6, margin: '0 0 28px' }}>
        OTP sent to <strong style={{ color: 'rgba(255,255,255,0.6)' }}>+91 {phone}</strong>
      </p>

      <div style={{ marginBottom: otpError ? 8 : 24 }}>
        <OtpInput value={otp} onChange={v => { setOtp(v); setOtpError(''); }} />
      </div>

      {otpError && (
        <p style={{ fontSize: 11, color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }}>{otpError}</p>
      )}

      <AuthBtn label="Verify & Sign In →" loading={loading} onClick={verifyPhoneOtp} disabled={otp.length < 6} />

      <button
        onClick={sendPhoneOtp}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', marginTop: 18, textAlign: 'center', textDecoration: 'underline' }}
      >
        Resend OTP
      </button>
    </div>
  );

  const PhaseEmailInput = React.memo(function PhaseEmailInput({ email, setEmail, loading, sendEmailLink, setPhase, linkSent, setLinkSent }: {
    email: string; setEmail: (v: string) => void; loading: boolean;
    sendEmailLink: () => void; setPhase: (p: PhaseType) => void;
    linkSent: boolean; setLinkSent: (v: boolean) => void;
  }) {
    return (
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <BackBtn onClick={() => { setPhase('choose'); setLinkSent(false); setEmail(''); }} />

        {!linkSent ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
              EMAIL SIGN IN
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.6, margin: '0 0 24px' }}>
              We&apos;ll send a magic link — no password needed
            </p>

            <div style={{ marginBottom: 6 }}>
              <FieldLabel text="Email Address" required />
              <AuthInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
            </div>
            <div style={{ height: 20 }} />
            <AuthBtn label='Send Magic Link →' loading={loading} onClick={sendEmailLink} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, paddingTop: 40 }}>
            <div style={{ fontSize: 48 }}>✉️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.08em', color: 'var(--sage)' }}>
              CHECK YOUR EMAIL
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 260 }}>
              We sent a sign-in link to<br />
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong>
            </p>
            <button
              onClick={() => { setLinkSent(false); setEmail(''); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer', textDecoration: 'underline', marginTop: 8 }}
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    );
  });

  const PhaseSignedIn = () => (
    <>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div className="account-avatar">{initials || '👤'}</div>
          <div>
            <div className="account-name">{displayName}</div>
            <div className="account-email">{displaySub}</div>
            <div className="account-member-tag">
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sage)' }} />
              Rare Member
            </div>
          </div>
        </div>
        <div className="account-stat-grid">
          {[{ num: myOrders.length > 0 ? String(myOrders.length) : '—', label: 'Orders' }, { num: String(productIds.length), label: 'Saved' }, { num: '—', label: 'Reviews' }].map(s => (
            <div key={s.label} className="account-stat-cell">
              <div className="account-stat-num">{s.num}</div>
              <div className="account-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => { closeAccount(); openWishlist(); }} className="account-quick-btn"
          style={{ background: 'rgba(200,200,200,0.07)', border: '1px solid rgba(254,189,166,0.15)', color: 'var(--blush)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,200,200,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(200,200,200,0.07)')}>
          <span>♡</span> Wishlist
          {productIds.length > 0 && (
            <span style={{ background: 'var(--blush)', color: 'var(--black)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{productIds.length}</span>
          )}
        </button>
        <button onClick={() => handleItem('track')} className="account-quick-btn"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(195,206,148,0.15)', color: 'var(--sage)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
          <span>🚚</span> Track Order
        </button>
      </div>

      <div className="account-menu">
        {MENU_ITEMS.map(item => (
          <button key={item.label} className="account-menu-item" onClick={() => handleItem(item.action)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="account-menu-icon">{item.icon}</span>
              {item.label}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)', marginTop: 'auto' }}>
        <button
          className="account-signout-btn"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{ width: '100%', opacity: signingOut ? 0.6 : 1 }}
          onMouseEnter={e => { if (!signingOut) { e.currentTarget.style.borderColor = 'var(--blush)'; e.currentTarget.style.color = 'var(--blush)'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--mid-gray)'; }}
        >
          {signingOut
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Signing out…
              </span>
            : 'Sign Out'}
        </button>
      </div>
    </>
  );

  /* ─── Orders ─────────────────────────────────────────────────── */
  const STATUS_COLOR: Record<string, string> = {
    shipped: 'var(--sage)', delivered: '#74c69d', processing: '#f4a25a',
    pending: 'rgba(255,255,255,0.35)', cancelled: 'rgba(255,107,107,0.6)', refunded: 'rgba(255,107,107,0.4)',
  };

  const PhaseOrders = () => {
    const formatOrderItems = (order: import('@/types').Order) => {
      return (order.items ?? []).map(item => {
        const name = (item.product as { name?: string } | null)?.name ?? '—';
        const size = (item.variant as { size?: string } | null)?.size ?? '';
        return `${name}${size ? ` (${size})` : ''}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`;
      }).join(' · ');
    };

    return (
      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={() => { setPhase('signed-in'); setOrdersView('list'); setReturnOrder(null); setReturnSubmitted(false); }}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', textAlign:'left', marginBottom:24, display:'flex', alignItems:'center', gap:6 }}
        >
          ← Back
        </button>

        {ordersView === 'list' && (
          <>
            <div style={{ fontFamily:'var(--font-display)', fontSize:26, letterSpacing:'0.08em', color:'var(--white)', marginBottom:20 }}>MY ORDERS</div>
            {ordersLoading && (
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, letterSpacing:'0.15em', textAlign:'center', padding:'40px 0' }}>Loading orders…</div>
            )}
            {!ordersLoading && myOrders.map(order => {
                const canCancel = order.status === 'pending' || order.status === 'processing';
                const placed = new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
                return (
                  <div key={order.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', padding:'16px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'0.05em', color:'rgba(255,255,255,0.85)' }}>#{order.id}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{placed}</div>
                      </div>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:STATUS_COLOR[order.status] || 'rgba(255,255,255,0.4)', padding:'3px 8px', border:`1px solid ${STATUS_COLOR[order.status] || 'rgba(255,255,255,0.1)'}`, background:`${STATUS_COLOR[order.status] || 'rgba(255,255,255,0.1)'}18` }}>
                        {order.status}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:12, lineHeight:1.6 }}>
                      {formatOrderItems(order) || 'No items'}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.04em', color:'rgba(255,255,255,0.7)' }}>
                        ₹{order.total.toLocaleString('en-IN')}
                      </span>
                      <div style={{ display:'flex', gap:8 }}>
                        {canCancel && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Cancel order #${order.id}? This cannot be undone.`)) return;
                              const res = await fetch('/api/orders/cancel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: order.id }),
                              });
                              if (res.ok) {
                                addToast('✓', `Order #${order.id} has been cancelled.`);
                                await loadOrders();
                              } else {
                                const body = await res.json().catch(() => ({}));
                                addToast('✕', body.error ?? 'Could not cancel. Please contact support@rareease.com.');
                              }
                            }}
                            style={{ background:'none', border:'1px solid rgba(255,107,107,0.3)', color:'rgba(255,107,107,0.7)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', padding:'6px 12px', cursor:'pointer' }}
                          >
                            Cancel
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <button
                            onClick={() => { setReturnOrder(order.id); setOrdersView('return'); setReturnSubmitted(false); }}
                            style={{ background:'none', border:'1px solid rgba(254,189,166,0.3)', color:'var(--blush)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', padding:'6px 12px', cursor:'pointer' }}
                          >
                            Return / Exchange
                          </button>
                        )}
                        <button
                          onClick={() => { closeAccount(); openOrderTracking(order.id); }}
                          style={{ background:'none', border:'1px solid rgba(195,206,148,0.3)', color:'var(--sage)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', padding:'6px 12px', cursor:'pointer' }}
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {!ordersLoading && myOrders.length === 0 && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'rgba(255,255,255,0.25)', textAlign:'center', paddingTop: 40 }}>
                <span style={{ fontSize:32 }}>📦</span>
                <div style={{ fontSize:13 }}>No orders yet</div>
                <div style={{ fontSize:11 }}>Your orders will appear here after your first purchase.</div>
              </div>
            )}
          </>
        )}

        {ordersView === 'return' && (
          <>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:'0.08em', color:'var(--white)', marginBottom:6 }}>RETURN / EXCHANGE</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:24 }}>Order #{returnOrder}</div>

            {returnSubmitted ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, textAlign:'center', paddingTop:32 }}>
                <div style={{ fontSize:40 }}>✦</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:'0.06em', color:'var(--sage)' }}>REQUEST SUBMITTED</div>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.8, maxWidth:280 }}>
                  Your {returnType} request for order #{returnOrder} has been received. We will respond within 24–48 hours at your registered email.
                </p>
                <button
                  onClick={() => setOrdersView('list')}
                  style={{ background:'none', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.2em', textTransform:'uppercase', padding:'10px 20px', cursor:'pointer', marginTop:8 }}
                >
                  Back to Orders
                </button>
              </div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
                  {(['return', 'exchange'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setReturnType(t)}
                      style={{ padding:'11px', background: returnType===t ? 'rgba(195,206,148,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${returnType===t ? 'rgba(195,206,148,0.4)' : 'rgba(255,255,255,0.08)'}`, color: returnType===t ? 'var(--sage)' : 'rgba(255,255,255,0.4)', fontFamily:'var(--font-body)', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.18s' }}
                    >
                      {t === 'return' ? '↩ Return' : '↔ Exchange'}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>
                    Reason <span style={{ color:'var(--sage)' }}>*</span>
                  </div>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:returnReason ? 'var(--white)' : 'rgba(255,255,255,0.3)', fontFamily:'var(--font-body)', fontSize:13, padding:'13px 16px', outline:'none' }}
                  >
                    <option value="">Select a reason</option>
                    <option value="wrong_size">Wrong size ordered</option>
                    <option value="damaged">Item arrived damaged</option>
                    <option value="wrong_item">Wrong item received</option>
                    <option value="quality">Quality issue</option>
                    <option value="not_as_described">Not as described</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'rgba(255,255,255,0.3)', lineHeight:1.7, marginBottom:20 }}>
                  Returns & exchanges are accepted within 48 hours of delivery. Items must be unworn, unwashed, with tags intact.
                </div>

                <button
                  onClick={async () => {
                    if (!returnReason) { addToast('⚠', 'Please select a reason'); return; }
                    if (!user || !returnOrder) { addToast('✕', 'Sign in required'); return; }
                    try {
                      const { getClient } = await import('@/lib/supabase');
                      const sb = getClient();
                      const { error } = await (sb as any)
                        .from('exchange_requests')
                        .insert({
                          order_id: returnOrder,
                          user_id: user.id,
                          type: returnType === 'return' ? 'cancellation' : 'exchange',
                          reason: returnReason,
                          status: 'pending',
                        });
                      if (error) throw error;
                      setReturnSubmitted(true);
                    } catch (err) {
                      console.error('[AccountPanel] return submit failed:', err);
                      addToast('✕', 'Could not submit request. Please email support@rareease.com');
                    }
                  }}
                  style={{ width:'100%', height:48, background:'var(--blush)', color:'var(--black)', border:'none', fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', cursor:'pointer', transition:'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fcc8b5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--blush)')}
                >
                  Submit {returnType === 'return' ? 'Return' : 'Exchange'} Request
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  /* ─── Address Book ───────────────────────────────────────────── */
  const saveAddress = async () => {
    if (!addrForm.name.trim() || !addrForm.line1.trim() || !addrForm.city.trim()) {
      addToast('⚠', 'Please fill in all required fields'); return;
    }
    if (!user) { addToast('⚠', 'Please sign in to save addresses'); return; }
    const { upsertAddress } = await import('@/lib/db');
    const payload = {
      user_id: user.id,
      label: addrForm.label || undefined,
      name: addrForm.name.trim(),
      line1: addrForm.line1.trim(),
      city: addrForm.city.trim(),
      state: addrForm.state || '',
      pincode: addrForm.pincode,
      phone: addrForm.phone || undefined,
      is_default: addresses.length === 0,
      ...(editingAddress ? { id: editingAddress.id } : {}),
    };
    const saved = await upsertAddress(payload);
    if (saved) {
      if (editingAddress) {
        setAddresses(prev => prev.map(a => a.id === editingAddress.id
          ? { ...a, ...addrForm, isDefault: a.isDefault } : a));
      } else {
        setAddresses(prev => [...prev, {
          id: saved.id, label: saved.label ?? '', name: saved.name, line1: saved.line1,
          city: saved.city, state: saved.state ?? '', pincode: saved.pincode,
          phone: saved.phone ?? '', isDefault: saved.is_default,
        }]);
      }
      addToast('✓', 'Address saved');
    } else {
      addToast('✕', 'Could not save address. Please try again.');
    }
    setAddingAddress(false); setEditingAddress(null);
    setAddrForm({ label:'', name:'', line1:'', city:'', state:'', pincode:'', phone:'' });
  };

  const AddrInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--white)', fontFamily:'var(--font-body)', fontSize:13, padding:'11px 14px', outline:'none', boxSizing:'border-box' } as React.CSSProperties} />
    </div>
  );

  /* ─── My Reviews ─────────────────────────────────────────────── */
  const PhaseReviews = () => {
    const [myReviews, setMyReviews] = React.useState<Array<{
      id: string; productName: string; rating: number; body: string;
      createdAt: string; isApproved: boolean;
    }>>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      if (!user) return;
      import('@/lib/supabase').then(({ getClient }) => {
        const client = getClient();
        client
          .from('reviews')
          .select('id, rating, body, is_approved, created_at, products(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setMyReviews((data ?? []).map((r: any) => ({
              id: r.id,
              productName: r.products?.name ?? '—',
              rating: r.rating,
              body: r.body,
              createdAt: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              isApproved: r.is_approved,
            })));
            setLoading(false);
          });
      });
    }, []);

    const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < n ? '#f4a25a' : 'rgba(255,255,255,0.15)', fontSize: 13 }}>★</span>
    ));

    return (
      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setPhase('signed-in')}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', textAlign:'left', marginBottom:24, display:'flex', alignItems:'center', gap:6 }}>
          ← Back
        </button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:26, letterSpacing:'0.08em', color:'var(--white)', marginBottom:20 }}>MY REVIEWS</div>

        {loading && (
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, letterSpacing:'0.15em', textAlign:'center', padding:'40px 0' }}>Loading reviews…</div>
        )}
        {!loading && myReviews.length === 0 && (
          <div style={{ color:'rgba(255,255,255,0.25)', fontSize:13, textAlign:'center', padding:'48px 0', lineHeight:1.8 }}>
            You haven&apos;t reviewed anything yet.<br />
            <span style={{ fontSize:11, letterSpacing:'0.1em' }}>Reviews appear after purchase.</span>
          </div>
        )}
        {!loading && myReviews.map(r => (
          <div key={r.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', padding:'16px', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{r.productName}</div>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', padding:'2px 7px',
                color: r.isApproved ? 'var(--sage)' : '#f4a25a',
                border: `1px solid ${r.isApproved ? 'rgba(195,206,148,0.3)' : 'rgba(244,162,90,0.3)'}`,
                background: r.isApproved ? 'rgba(195,206,148,0.08)' : 'rgba(244,162,90,0.08)'
              }}>
                {r.isApproved ? 'Published' : 'Pending'}
              </span>
            </div>
            <div style={{ marginBottom:6 }}>{stars(r.rating)}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:6 }}>{r.body}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em' }}>{r.createdAt}</div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── Size Guide ─────────────────────────────────────────────── */
  const PhaseSizeGuide = () => {
    const [tab, setTab] = React.useState<'men' | 'women'>('men');
    const [unit, setUnit] = React.useState<'in' | 'cm'>('in');

    const MEN = [
      { size:'S',   chest:'33–36"', chestCm:'84–92 cm',   waist:'30–32"', waistCm:'76–82 cm',   shoulder:'17.5"' },
      { size:'M',   chest:'36–39"', chestCm:'92–100 cm',  waist:'32–34"', waistCm:'82–88 cm',   shoulder:'18.5"' },
      { size:'L',   chest:'39–42"', chestCm:'100–108 cm', waist:'34–37"', waistCm:'88–96 cm',   shoulder:'19.5"' },
      { size:'XL',  chest:'42–45"', chestCm:'108–116 cm', waist:'37–41"', waistCm:'96–104 cm',  shoulder:'20.5"' },
      { size:'XXL', chest:'45–48"', chestCm:'116–124 cm', waist:'41–45"', waistCm:'104–114 cm', shoulder:'21.5"' },
    ];
    const WOMEN = [
      { size:'S',   bust:'33–35"', bustCm:'84–90 cm',   waist:'26–28"', waistCm:'68–74 cm',   hip:'35–37"', hipCm:'89–94 cm'   },
      { size:'M',   bust:'36–38"', bustCm:'91–98 cm',   waist:'29–31"', waistCm:'75–82 cm',   hip:'38–40"', hipCm:'96–102 cm'  },
      { size:'L',   bust:'39–41"', bustCm:'99–106 cm',  waist:'32–34"', waistCm:'83–90 cm',   hip:'41–43"', hipCm:'104–109 cm' },
      { size:'XL',  bust:'42–44"', bustCm:'107–114 cm', waist:'35–37"', waistCm:'91–98 cm',   hip:'44–46"', hipCm:'112–117 cm' },
      { size:'XXL', bust:'45–47"', bustCm:'115–122 cm', waist:'38–40"', waistCm:'99–106 cm',  hip:'47–49"', hipCm:'119–124 cm' },
    ];

    const cell = (v: string) => (
      <td style={{ padding:'10px 14px', fontSize:13, color:'rgba(255,255,255,0.65)', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'center' }}>{v}</td>
    );
    const th = (v: string) => (
      <th style={{ padding:'10px 14px', fontSize:9, fontWeight:700, letterSpacing:'0.2em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', textAlign:'center', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{v}</th>
    );

    return (
      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setPhase('signed-in')}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', textAlign:'left', marginBottom:24, display:'flex', alignItems:'center', gap:6 }}>
          ← Back
        </button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:26, letterSpacing:'0.08em', color:'var(--white)', marginBottom:4 }}>SIZE GUIDE</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', marginBottom:20 }}>Rare Ease — Oversized streetwear fit</div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', gap:4 }}>
            {(['men','women'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ background: tab===t ? 'var(--white)' : 'rgba(255,255,255,0.06)', color: tab===t ? 'var(--black)' : 'rgba(255,255,255,0.5)', border:'none', fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', padding:'8px 16px', cursor:'pointer', transition:'all 0.2s' }}
              >{t}&apos;s</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {(['in','cm'] as const).map(u => (
              <button key={u} onClick={() => setUnit(u)}
                style={{ background: unit===u ? 'rgba(255,255,255,0.12)' : 'transparent', color: unit===u ? 'var(--white)' : 'rgba(255,255,255,0.3)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', padding:'5px 10px', cursor:'pointer' }}
              >{u}</button>
            ))}
          </div>
        </div>

        <div style={{ overflowX:'auto' }}>
          {tab === 'men' ? (
            <table style={{ width:'100%', borderCollapse:'collapse', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <thead><tr>{th('Size')}{th(unit==='in' ? 'Chest' : 'Chest (cm)')}{th(unit==='in' ? 'Waist' : 'Waist (cm)')}{th('Shoulder')}</tr></thead>
              <tbody>{MEN.map(r => (
                <tr key={r.size}>
                  <td style={{ padding:'10px 14px', fontSize:14, fontFamily:'var(--font-display)', letterSpacing:'0.08em', color:'var(--white)', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'center' }}>{r.size}</td>
                  {cell(unit==='in' ? r.chest : r.chestCm)}
                  {cell(unit==='in' ? r.waist : r.waistCm)}
                  {cell(r.shoulder)}
                </tr>
              ))}</tbody>
            </table>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <thead><tr>{th('Size')}{th(unit==='in' ? 'Bust' : 'Bust (cm)')}{th(unit==='in' ? 'Waist' : 'Waist (cm)')}{th(unit==='in' ? 'Hip' : 'Hip (cm)')}</tr></thead>
              <tbody>{WOMEN.map(r => (
                <tr key={r.size}>
                  <td style={{ padding:'10px 14px', fontSize:14, fontFamily:'var(--font-display)', letterSpacing:'0.08em', color:'var(--white)', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'center' }}>{r.size}</td>
                  {cell(unit==='in' ? r.bust : r.bustCm)}
                  {cell(unit==='in' ? r.waist : r.waistCm)}
                  {cell(unit==='in' ? r.hip : r.hipCm)}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop:20, padding:'14px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.8 }}>
          💡 Our cuts run slightly oversized. If you&apos;re between sizes, size down for a fitted look or stay for the relaxed drape.
        </div>
      </div>
    );
  };

  const PhaseAddresses = () => (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => { setPhase('signed-in'); setAddingAddress(false); setEditingAddress(null); }}
        style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', textAlign:'left', marginBottom:24, display:'flex', alignItems:'center', gap:6 }}>
        ← Back
      </button>

      {(addingAddress || editingAddress) ? (
        <>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:'0.08em', color:'var(--white)', marginBottom:20 }}>
            {editingAddress ? 'EDIT ADDRESS' : 'ADD ADDRESS'}
          </div>
          <AddrInput label="Label (e.g. Home, Work)" value={addrForm.label} onChange={v => setAddrForm(p => ({...p, label:v}))} placeholder="Home" />
          <AddrInput label="Full Name *" value={addrForm.name} onChange={v => setAddrForm(p => ({...p, name:v}))} placeholder="Aryan Kumar" />
          <AddrInput label="Address *" value={addrForm.line1} onChange={v => setAddrForm(p => ({...p, line1:v}))} placeholder="House / Flat, Street, Area" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <AddrInput label="City *" value={addrForm.city} onChange={v => setAddrForm(p => ({...p, city:v}))} placeholder="Bengaluru" />
            <AddrInput label="Pincode" value={addrForm.pincode} onChange={v => setAddrForm(p => ({...p, pincode:v}))} placeholder="560001" />
          </div>
          <AddrInput label="Phone" value={addrForm.phone} onChange={v => setAddrForm(p => ({...p, phone:v}))} placeholder="9876543210" />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button onClick={() => { setAddingAddress(false); setEditingAddress(null); }}
              style={{ flex:1, height:44, background:'none', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={saveAddress}
              style={{ flex:2, height:44, background:'var(--white)', color:'var(--black)', border:'none', fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', cursor:'pointer' }}>
              Save Address
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, letterSpacing:'0.08em', color:'var(--white)' }}>SAVED ADDRESSES</div>
            <button onClick={() => { setAddingAddress(true); setAddrForm({ label:'', name:'', line1:'', city:'', state:'', pincode:'', phone:'' }); }}
              style={{ background:'none', border:'1px solid rgba(195,206,148,0.3)', color:'var(--sage)', fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', padding:'7px 14px', cursor:'pointer' }}>
              + Add New
            </button>
          </div>

          {addresses.map(addr => (
            <div key={addr.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${addr.isDefault ? 'rgba(195,206,148,0.25)' : 'rgba(255,255,255,0.07)'}`, padding:'14px 16px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:'0.08em' }}>{addr.label || 'Address'}</span>
                  {addr.isDefault && <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', padding:'2px 7px', background:'rgba(195,206,148,0.1)', color:'var(--sage)', border:'1px solid rgba(195,206,148,0.25)' }}>Default</span>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setEditingAddress(addr); setAddrForm({ label:addr.label, name:addr.name, line1:addr.line1, city:addr.city, state:addr.state, pincode:addr.pincode, phone:addr.phone }); }}
                    style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:10, letterSpacing:'0.1em', textDecoration:'underline' }}>Edit</button>
                  <button onClick={async () => {
                    const { deleteAddress } = await import('@/lib/db');
                    await deleteAddress(addr.id);
                    setAddresses(prev => prev.filter(a => a.id !== addr.id));
                  }}
                    style={{ background:'none', border:'none', color:'rgba(255,107,107,0.5)', cursor:'pointer', fontSize:10, letterSpacing:'0.1em', textDecoration:'underline' }}>Remove</button>
                </div>
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                {addr.name} · {addr.line1}, {addr.city} {addr.pincode}
                {addr.phone && <><br />{addr.phone}</>}
              </div>
              {!addr.isDefault && (
                <button onClick={async () => {
                  if (!user) return;
                  const { upsertAddress } = await import('@/lib/db');
                  await upsertAddress({ id: addr.id, user_id: user.id, name: addr.name, line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode, is_default: true });
                  setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })));
                }}
                  style={{ marginTop:10, background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:10, letterSpacing:'0.1em', textDecoration:'underline', padding:0 }}>
                  Set as default
                </button>
              )}
            </div>
          ))}

          {addresses.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'rgba(255,255,255,0.25)', textAlign:'center', paddingTop:40 }}>
              <span style={{ fontSize:32 }}>📍</span>
              <div style={{ fontSize:13 }}>No saved addresses yet</div>
              <div style={{ fontSize:11 }}>Add an address to speed up checkout.</div>
            </div>
          )}
        </>
      )}
    </div>
  );

  /* ─── Phase selector ──────────────────────────────────────────── */
  const renderPhase = () => {
    switch (phase) {
      case 'choose':      return <PhaseChoose />;
      case 'phone-input':
      case 'phone-otp':   return <AuthPhone
          onBack={() => setPhase('choose')}
          onSuccess={(u) => { setUser(u); setPhase('signed-in'); }}
          addToast={addToast}
        />;
      case 'email-input': return <PhaseEmailInput email={email} setEmail={setEmail} loading={loading} sendEmailLink={sendEmailLink} setPhase={setPhase} linkSent={linkSent} setLinkSent={setLinkSent} />;
      case 'signed-in':   return <PhaseSignedIn />;
      case 'orders':      return <PhaseOrders />;
      case 'addresses':   return <PhaseAddresses />;
      case 'reviews':     return <PhaseReviews />;
      case 'sizeGuide':   return <PhaseSizeGuide />;
      default:            return null;
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     PORTAL RENDER
     ─────────────────────────────────────────────────────────────────
     KEY CHANGE vs the old version:
     Instead of:
       backdrop (position:absolute) + panel (position:absolute, right:0)
     We now use the SAME pattern as SearchOverlay:
       One flat position:fixed container that IS the overlay.
       The panel sits inside it as a flex child (margin-left:auto).
       overflowY:auto is on the OUTER container, not a nested div.
       When the mobile keyboard opens, the browser shrinks the viewport
       and the container reflows naturally — inputs stay visible.
  ══════════════════════════════════════════════════════════════════ */
  const panel = (
    <AnimatePresence>
      {isAccountOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9500,
            display: 'flex',
            // Clicking the backdrop (outside the inner panel) closes
          }}
          onClick={closeAccount}
        >
          {/* Backdrop blur layer — pointer-events handled by outer div's onClick */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            WebkitBackdropFilter: 'blur(4px)',
            backdropFilter: 'blur(4px)',
          }} />

          {/* 
            Panel — slide in from right.
            margin-left:auto pushes it to the right side.
            overflow-y:auto on THIS element (not a parent) so the browser
            knows the scrollable region and can properly adjust when the
            software keyboard appears.
          */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',          // NOT absolute — lives in normal flex flow
              marginLeft: 'auto',
              width: '100%',
              maxWidth: 400,
              background: '#070707',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}
          >
            {/* Header — sticky so it's always visible while scrolling */}
            <div className="account-panel-header" style={{ position: 'sticky', top: 0, zIndex: 1, background: '#070707' }}>
              <span className="account-panel-title">Account</span>
              <button className="panel-close-btn" onClick={closeAccount} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Animated phase transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.18 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                {renderPhase()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}