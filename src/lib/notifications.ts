/**
 * notifications.ts — Persist notifications to Supabase for logged-in users.
 * Falls back silently for guests (no-op).
 */
'use client';

import { getClient } from '@/lib/supabase';
import type { Notification } from '@/types';

/** Load the most recent 20 notifications for the current user. */
export async function loadNotifications(): Promise<Notification[]> {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  const { data } = await client
    .from('user_notifications')
    .select('id, type, icon, msg, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((r: any) => ({
    id:     r.id,
    type:   r.type,
    icon:   r.icon,
    msg:    r.msg,
    time:   formatRelative(r.created_at),
    unread: !r.is_read,
  }));
}

/** Mark all notifications as read for the current user. */
export async function markNotificationsRead(): Promise<void> {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  await client
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
}

/** Insert a notification for the current user (client-side, e.g. after order placed). */
export async function insertNotification(
  type: Notification['type'],
  icon: string,
  msg: string,
): Promise<void> {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  await client.from('user_notifications').insert({
    user_id: user.id,
    type, icon, msg,
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
