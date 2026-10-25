import type { AppSupabase } from '../../supabase';
import type { Notification, NotificationCategory } from '../../../types/message';
import { toAppError } from '../errors';
import { rpc } from './rpc';

export async function getNotifications(sb: AppSupabase, limit = 50): Promise<Notification[]> {
  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw toAppError(error);
  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: !!row.read_at,
    created_at: row.created_at,
    action_url: row.action_url,
    data: row.data || {},
  }));
}

export async function markNotificationRead(sb: AppSupabase, id: string): Promise<void> {
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw toAppError(error);
}

export async function markAllNotificationsRead(sb: AppSupabase): Promise<void> {
  await rpc<void>(sb, 'mark_all_notifications_read');
}

export async function getNotificationPrefs(
  sb: AppSupabase
): Promise<Record<NotificationCategory, { push: boolean; inApp: boolean }>> {
  const { data, error } = await sb
    .from('notification_preferences')
    .select('*');

  if (error) throw toAppError(error);

  const result: Record<string, any> = {};
  (data ?? []).forEach(row => {
    result[row.category] = { push: row.push_enabled, inApp: row.in_app_enabled };
  });
  return result;
}

export async function setNotificationPref(
  sb: AppSupabase,
  category: NotificationCategory,
  v: { push?: boolean; inApp?: boolean }
): Promise<void> {
  const { error } = await sb
    .from('notification_preferences')
    .upsert({
      category,
      push_enabled: v.push,
      in_app_enabled: v.inApp,
    })
    .eq('category', category);

  if (error) throw toAppError(error);
}

export async function registerDevice(
  sb: AppSupabase,
  token: string,
  platform: 'web' | 'ios' | 'android',
  meta?: { appVersion?: string; locale?: string }
): Promise<void> {
  await rpc<void>(sb, 'register_device', {
    p_token: token,
    p_platform: platform,
    p_meta: meta,
  });
}

export async function unregisterDevice(sb: AppSupabase, token: string): Promise<void> {
  await rpc<void>(sb, 'unregister_device', { p_token: token });
}
