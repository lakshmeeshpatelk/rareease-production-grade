'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { loadNotifications, markNotificationsRead } from '@/lib/notifications';

export default function NotificationPanel() {
  const { isNotificationsOpen, closeNotifications, notifications, markAllRead, addNotification } = useUIStore();

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Load from Supabase when panel opens; mark all read when it closes
  useEffect(() => {
    if (isNotificationsOpen) {
      loadNotifications().then((notifs) => {
        notifs.forEach((n) => {
          // Only add if not already in store (avoid dupes on re-open)
          if (!notifications.find((existing) => existing.id === n.id)) {
            addNotification(n);
          }
        });
      });
    } else {
      // Mark read in DB after closing
      markNotificationsRead().catch(() => {});
      markAllRead();
    }
  }, [isNotificationsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {isNotificationsOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 350 }}
            onClick={closeNotifications}
          />
          <motion.div
            className="notif-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Header */}
            <div className="notif-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="notif-title">Notifications</span>
                {unreadCount > 0 && (
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--black)',
                    background: 'var(--sage)',
                    borderRadius: '50%',
                    width: 18, height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button
                  onClick={closeNotifications}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--mid-gray)', fontSize: 14,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--white)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--mid-gray)')}
                  aria-label="Close notifications"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--mid-gray)',
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item${notif.unread ? ' unread' : ''}`}
                  >
                    <span className="notif-icon">{notif.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div
                        className="notif-msg"
                        dangerouslySetInnerHTML={{ __html: notif.msg }}
                      />
                      <div className="notif-time">{notif.time}</div>
                    </div>
                    {notif.unread && <div className="notif-dot" />}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.18)',
              }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
