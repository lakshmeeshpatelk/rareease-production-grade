'use client';

/**
 * AuthPhone — self-contained phone OTP signup component.
 * Owns its own phone/otp/loading state so that typing never
 * causes AccountPanel to re-render and remount this input.
 * Same pattern as OrderTrackingOverlay which has zero keyboard flicker.
 */

import { useState, useRef, useEffect } from 'react';
import { getClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { PhaseType } from './AccountPanel';

/* ── Reusable pieces ─────────────────────────────────────────── */
function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 7 }}>
      {text}{required && <span style={{ color: 'var(--sage)', marginLeft: 3 }}>*</span>}
    </div>
  );
}

function AuthBtn({ label, loading, onClick, disabled }: { label: string; loading?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={loading || disabled}
      style={{ width: '100%', minHeight: 48, background: 'var(--white)', color: 'var(--black)', border: 'none', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: loading || disabled ? 'not-allowed' : 'pointer', opacity: loading || disabled ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 } as React.CSSProperties}
    >
      {loading
        ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : label}
    </button>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const handleChange = (i: number, ch: string) => {
    const d = ch.replace(/\D/, '');
    const arr = value.split(''); arr[i] = d;
    onChange(arr.join('').slice(0, 6));
    if (d && i < 5) refs[i + 1].current?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs[i - 1].current?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p);
    refs[Math.min(p.length, 5)].current?.focus();
  };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={refs[i]} type="tel" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
          style={{ width: 44, height: 52, textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid ${value[i] ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`, color: 'var(--white)', fontSize: 22, fontFamily: 'var(--font-display)', outline: 'none' } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface Props {
  onBack: () => void;
  onSuccess: (user: User) => void;
  addToast: (icon: string, msg: string) => void;
}

/* ── Main component ──────────────────────────────────────────── */
export default function AuthPhone({ onBack, onSuccess, addToast }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { addToast('⚠', 'Enter a valid 10-digit number'); return; }
    setLoading(true);
    const { error } = await (getClient() as any).auth.signInWithOtp({ phone: `+91${cleaned}`, options: {} });
    setLoading(false);
    if (error) { addToast('✕', error.message ?? 'Could not send OTP'); return; }
    setStep('otp');
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setLoading(true); setOtpError('');
    const cleaned = phone.replace(/\D/g, '');
    const { data, error } = await (getClient() as any).auth.verifyOtp({
      phone: `+91${cleaned}`, token: otp, type: 'sms',
    });
    setLoading(false);
    if (error) { setOtpError('Incorrect code — try again'); setOtp(''); return; }
    if (data?.user) { addToast('✓', 'Signed in successfully!'); onSuccess(data.user); }
  };

  if (step === 'phone') {
    return (
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
          MOBILE NUMBER
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: '0 0 24px' }}>
          We&apos;ll send a 6-digit OTP to verify your number
        </p>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel text="Mobile Number" required />
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ padding: '0 12px', fontFamily: 'var(--font-body)', fontSize: 'max(16px, 13px)', color: 'rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
              +91
            </span>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="98765 43210"
              maxLength={10}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--white)', padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 'max(16px, 13px)', WebkitAppearance: 'none' } as React.CSSProperties}
            />
          </div>
        </div>
        <AuthBtn label="Send OTP →" loading={loading} onClick={sendOtp} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 16 }}>
          Standard SMS charges may apply
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => { setStep('phone'); setOtp(''); setOtpError(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back
      </button>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
        ENTER OTP
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: '0 0 28px' }}>
        OTP sent to <strong style={{ color: 'rgba(255,255,255,0.6)' }}>+91 {phone}</strong>
      </p>
      <div style={{ marginBottom: otpError ? 8 : 24 }}>
        <OtpInput value={otp} onChange={v => { setOtp(v); setOtpError(''); }} />
      </div>
      {otpError && <p style={{ fontSize: 11, color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }}>{otpError}</p>}
      <AuthBtn label="Verify & Sign In →" loading={loading} onClick={verifyOtp} disabled={otp.length < 6} />
      <button onClick={sendOtp} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', marginTop: 18, textAlign: 'center', textDecoration: 'underline' }}>
        Resend OTP
      </button>
    </div>
  );
}