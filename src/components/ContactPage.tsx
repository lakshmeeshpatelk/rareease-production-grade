'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useEscapeKey } from '@/lib/useEscapeKey';

export default function ContactPage() {
  const { isContactOpen, closeContact, addToast } = useUIStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEscapeKey(closeContact, isContactOpen);

  const handleSubmit = async () => {
    if (!name.trim()) { addToast('⚠', 'Please enter your name'); return; }
    if (!email.trim() || !email.includes('@')) { addToast('⚠', 'Please enter a valid email'); return; }
    if (message.trim().length < 10) { addToast('⚠', 'Please write a message (min 10 chars)'); return; }
    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      addToast('✓', 'Message sent! We\'ll get back to you soon.');
      setName(''); setEmail(''); setMessage('');
      closeContact();
    } catch {
      addToast('✕', 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--white)',
    fontSize: 16,
    padding: '14px 16px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.04em',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <AnimatePresence>
      {isContactOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={closeContact}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{
              background: '#0d0d0d',
              border: '1px solid rgba(255,255,255,0.08)',
              width: '100%',
              maxWidth: 520,
              padding: '48px 40px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeContact}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                fontSize: 20, lineHeight: 1,
              }}
            >
              ✕
            </button>

            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: 12 }}>
              Get In Touch
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--white)', marginBottom: 8, lineHeight: 1 }}>
              CONTACT US
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', lineHeight: 1.6, marginBottom: 32 }}>
              Have a question? We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24 hours.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 8 }}>Your Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 8 }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 8 }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={sending}
                style={{
                  background: 'var(--white)',
                  color: 'var(--black)',
                  border: 'none',
                  padding: '16px 32px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  cursor: sending ? 'wait' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  marginTop: 8,
                }}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                Or email us directly: <a href="mailto:rareeaseofficial@gmail.com" style={{ color: 'var(--sage)', textDecoration: 'none' }}>rareeaseofficial@gmail.com</a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
