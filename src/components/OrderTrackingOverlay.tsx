'use client';

import { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import type { Order } from '@/types';

// Status → step index
const STATUS_STEP: Record<string, number> = {
  pending:    0,
  processing: 1,
  shipped:    2,
  delivered:  4,
  cancelled:  0,
};

function buildSteps(order: Order) {
  const addr = order.shipping_address as { name?: string };
  const activeStep = STATUS_STEP[order.status] ?? 0;
  const placed = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return {
    activeStep,
    steps: [
      { label: 'Order Placed',      sub: 'Payment confirmed',                                       time: placed },
      { label: 'Processing',        sub: 'Being prepared at warehouse',                             time: activeStep >= 1 ? '+1 day' : '—' },
      { label: 'Shipped',           sub: order.tracking_number ? `${order.courier ?? ''} ${order.tracking_number}` : (activeStep >= 2 ? 'In transit' : 'Pending'), time: activeStep >= 2 ? '+2–3 days' : '—' },
      { label: 'Out for Delivery',  sub: activeStep >= 3 ? 'With delivery partner' : 'Pending',     time: activeStep >= 3 ? '+4 days' : '—' },
      { label: 'Delivered',         sub: order.status === 'delivered' ? 'Successfully delivered' : 'Pending', time: order.status === 'delivered' ? '✓' : '—' },
    ],
  };
}

type TrackResult = 'idle' | 'loading' | 'not_found' | Order;

export default function OrderTrackingOverlay() {
  const { isOrderTrackingOpen, closeOrderTracking, pendingTrackId } = useUIStore();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TrackResult>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(closeOrderTracking, isOrderTrackingOpen);

  useEffect(() => {
    if (isOrderTrackingOpen) {
      if (pendingTrackId) {
        // Pre-populate and immediately fetch when opened from My Orders
        setInput(pendingTrackId);
        setResult('loading');
        fetch(`/api/orders/track?id=${encodeURIComponent(pendingTrackId)}`)
          .then(r => r.json())
          .then(data => setResult(data.error ? 'not_found' : data as Order))
          .catch(() => setResult('not_found'));
      } else {
        setInput('');
        setResult('idle');
        const t = setTimeout(() => inputRef.current?.focus(), 150);
        return () => clearTimeout(t);
      }
    }
  }, [isOrderTrackingOpen, pendingTrackId]);

  const track = async () => {
    const id = input.trim().toUpperCase();
    if (!id) return;
    setResult('loading');
    try {
      // Use the server-side API route which uses the admin client,
      // bypassing RLS so both guest and logged-in orders are found.
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(id)}`);
      if (!res.ok) { setResult('not_found'); return; }
      const order = await res.json();
      setResult(order);
    } catch {
      setResult('not_found');
    }
  };

  const statusBadge = (status: string) => ({
    class: { shipped: 'ot-status-shipped', processing: 'ot-status-processing', delivered: 'ot-status-delivered', pending: 'ot-status-processing', cancelled: 'ot-status-cancelled' }[status] ?? '',
    label: { shipped: 'Shipped', processing: 'Processing', delivered: 'Delivered', pending: 'Pending', cancelled: 'Cancelled' }[status] ?? status,
  });

  return (
    <AnimatePresence>
      {isOrderTrackingOpen && (
        <motion.div
          className="ot-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.target === e.currentTarget && closeOrderTracking()}
        >
          <motion.div
            className="ot-box"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="ot-box-header">
              <span className="ot-box-title">Track Order</span>
              <button
                className="overlay-close-x"
                onClick={closeOrderTracking}
                aria-label="Close"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="ot-box-body">
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.7 }}>
                Enter your order ID to track your delivery in real-time.
              </div>

              <div className="ot-input-row">
                <input
                  ref={inputRef}
                  className="ot-input"
                  placeholder="Enter Order ID (e.g. RE847291)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && track()}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ fontSize: 'max(16px, 13px)' }}
                />
                <button className="ot-track-btn" onClick={track} disabled={result === 'loading'}>
                  {result === 'loading' ? '…' : 'Track'}
                </button>
              </div>

              {result === 'not_found' && (
                <div style={{ padding: 24, border: '1px solid rgba(239,35,60,0.2)', background: 'rgba(239,35,60,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  No order found for <strong style={{ color: 'var(--white)' }}>{input}</strong>. Please check your order ID and try again.
                </div>
              )}

              {result !== 'idle' && result !== 'loading' && result !== 'not_found' && (() => {
                const order = result as Order;
                const badge = statusBadge(order.status);
                const addr = order.shipping_address as { name?: string };
                const { activeStep, steps } = buildSteps(order);
                const placed = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <>
                    <div className="ot-order-card">
                      <div className="ot-order-meta">
                        <div>
                          <div className="ot-order-num">#{order.id}</div>
                          <div className="ot-order-date">Placed on {placed} · {addr?.name ?? ''}</div>
                        </div>
                        <div className={`ot-order-status ${badge.class}`}>{badge.label}</div>
                      </div>

                      {order.status === 'cancelled' ? (
                        <div style={{ padding: '20px 0', fontSize: 13, color: 'rgba(255,107,107,0.7)' }}>
                          This order has been cancelled. If you have questions, contact support@rareease.com
                        </div>
                      ) : (
                        <div className="ot-timeline">
                          {steps.map((step, i) => (
                            <div key={i} className={`ot-step${i < activeStep ? ' done' : ''}${i === activeStep ? ' active' : ''}`}>
                              <div className="ot-step-left">
                                <div className="ot-step-dot" />
                                <div className="ot-step-line" />
                              </div>
                              <div className="ot-step-content">
                                <div className="ot-step-label">{step.label}</div>
                                <div className="ot-step-sub">{step.sub}</div>
                                <div className="ot-step-time">{step.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(order.items ?? []).length > 0 && (
                        <>
                          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid-gray)', marginBottom: 14, marginTop: 8 }}>
                            Items in this order
                          </div>
                          <div className="ot-items">
                            {(order.items ?? []).map((item, i) => {
                              const name = (item.product as { name?: string } | null)?.name ?? '—';
                              const size = (item.variant as { size?: string } | null)?.size ?? '';
                              return (
                                <div key={i} className="ot-item">
                                  <div className="ot-item-thumb">{name.slice(0, 3).toUpperCase()}</div>
                                  <div className="ot-item-name">{name}{size ? ` (${size})` : ''} × {item.quantity}</div>
                                  <div className="ot-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="ot-delivery-note">
                      <strong>Estimated delivery:</strong>{' '}
                      {order.status === 'delivered' ? 'Delivered ✓' : '4–8 business days'} ·
                      Contact: <strong>support@rareease.com</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
