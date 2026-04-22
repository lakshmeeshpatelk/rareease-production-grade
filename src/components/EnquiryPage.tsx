'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useEscapeKey } from '@/lib/useEscapeKey';

const ENQUIRY_TYPES = [
  { value: 'bulk',        label: 'Bulk Order',           icon: '📦' },
  { value: 'custom',      label: 'Custom Design / Print', icon: '🎨' },
  { value: 'collab',      label: 'Brand Collaboration',   icon: '🤝' },
  { value: 'gifting',     label: 'Corporate Gifting',      icon: '🎁' },
  { value: 'wholesale',   label: 'Wholesale / Reseller',  icon: '🏪' },
  { value: 'other',       label: 'Other',                  icon: '💬' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--white)',
  fontSize: 16,
  padding: '13px 16px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  letterSpacing: '0.04em',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  borderRadius: 0,
  WebkitAppearance: 'none',
} as React.CSSProperties;

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
  display: 'block',
  marginBottom: 8,
};

export default function EnquiryPage() {
  const { isEnquiryOpen, closeEnquiry, addToast } = useUIStore();
  useEscapeKey(closeEnquiry, isEnquiryOpen);

  const [enquiryType, setEnquiryType] = useState('');
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [quantity,    setQuantity]    = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const reset = () => {
    setEnquiryType(''); setName(''); setEmail('');
    setPhone(''); setQuantity(''); setMessage('');
    setSending(false); setSubmitted(false);
  };

  const handleClose = () => { reset(); closeEnquiry(); };

  const handleSubmit = async () => {
    if (!enquiryType)               { addToast('⚠', 'Please select an enquiry type'); return; }
    if (!name.trim())                { addToast('⚠', 'Please enter your name'); return; }
    if (!email.trim() || !email.includes('@')) { addToast('⚠', 'Please enter a valid email'); return; }
    if (message.trim().length < 10) { addToast('⚠', 'Please describe your requirements (min 10 chars)'); return; }

    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      setSubmitted(true);
    } catch {
      addToast('✕', 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)');
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)');

  return (
    <AnimatePresence>
      {isEnquiryOpen && (
        /* ── Backdrop ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.75)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={handleClose}
        >
          {/* ── Modal card ── */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0,    y: 28, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.09)',
              width: '100%', maxWidth: 560,
              maxHeight: '92dvh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Close button ── */}
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                position: 'absolute', top: 18, right: 18, zIndex: 2,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>

            {/* ─────────────────── SUCCESS STATE ─────────────────── */}
            {submitted ? (
              <div style={{ padding: '64px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>✦</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '0.06em', color: 'var(--white)', marginBottom: 12 }}>
                  ENQUIRY RECEIVED
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 340, margin: '0 auto 32px' }}>
                  Thank you, <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{name}</strong>! We&apos;ve received your custom enquiry and will get back to you at <strong style={{ color: 'var(--sage)' }}>{email}</strong> within 24–48 hours.
                </p>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'var(--white)', color: 'var(--black)',
                    border: 'none', padding: '13px 32px',
                    fontFamily: 'var(--font-body)', fontSize: 10,
                    fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  Done
                </button>
              </div>
            ) : (
              /* ─────────────────── FORM STATE ─────────────────── */
              <div style={{ padding: '44px 40px 48px' }}>

                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: 10 }}>
                    Custom Request
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--white)', marginBottom: 10, lineHeight: 0.95 }}>
                    CUSTOM<br />ENQUIRY
                  </h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, maxWidth: 400 }}>
                    Bulk orders, custom prints, brand collabs, or corporate gifting — tell us what you have in mind and we&apos;ll craft something rare.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* ── Enquiry type grid ── */}
                  <div>
                    <label style={labelStyle}>
                      Enquiry Type <span style={{ color: 'var(--sage)' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {ENQUIRY_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setEnquiryType(t.value)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px',
                            background: enquiryType === t.value ? 'rgba(195,206,148,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${enquiryType === t.value ? 'rgba(195,206,148,0.45)' : 'rgba(255,255,255,0.09)'}`,
                            color: enquiryType === t.value ? 'var(--sage)' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', textAlign: 'left',
                            fontFamily: 'var(--font-body)', fontSize: 11,
                            fontWeight: enquiryType === t.value ? 600 : 400,
                            letterSpacing: '0.05em',
                            transition: 'all 0.18s',
                            WebkitTapHighlightColor: 'transparent',
                          } as React.CSSProperties}
                          onMouseEnter={e => { if (enquiryType !== t.value) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                          onMouseLeave={e => { if (enquiryType !== t.value) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                        >
                          <span style={{ fontSize: 15, lineHeight: 1 }}>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Name + Email row ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Full Name <span style={{ color: 'var(--sage)' }}>*</span></label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Aryan Kumar"
                        style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email <span style={{ color: 'var(--sage)' }}>*</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                      />
                    </div>
                  </div>

                  {/* ── Phone + Quantity row ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Phone (optional)</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Approx. Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        placeholder="e.g. 50"
                        style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                      />
                    </div>
                  </div>

                  {/* ── Requirements textarea ── */}
                  <div>
                    <label style={labelStyle}>
                      Your Requirements <span style={{ color: 'var(--sage)' }}>*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Describe what you need — style, colours, print details, timeline, budget, or anything else that helps us understand your vision..."
                      rows={5}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 120 } as React.CSSProperties}
                      onFocus={focusStyle} onBlur={blurStyle}
                    />
                  </div>

                  {/* ── Submit ── */}
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    style={{
                      background: 'var(--sage)', color: 'var(--black)',
                      border: 'none', padding: '16px 32px',
                      fontFamily: 'var(--font-body)', fontSize: 11,
                      fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
                      cursor: sending ? 'wait' : 'pointer',
                      opacity: sending ? 0.7 : 1,
                      transition: 'opacity 0.2s, background 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      marginTop: 4,
                    }}
                    onMouseEnter={e => { if (!sending) e.currentTarget.style.background = 'var(--white)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--sage)'; }}
                  >
                    {sending ? (
                      <>
                        <span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        Submitting…
                      </>
                    ) : (
                      'Submit Enquiry →'
                    )}
                  </button>

                  {/* ── Direct email ── */}
                  <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>
                      Or reach us directly at{' '}
                      <a
                        href="mailto:rareeaseofficial@gmail.com"
                        style={{ color: 'var(--sage)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        rareeaseofficial@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
