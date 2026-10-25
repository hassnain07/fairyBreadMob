import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bell, Check, AlertCircle } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNotifications, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import type { ParentMoreStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<ParentMoreStackParamList, 'Notifications'>;

export function NotificationsPage({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('confirmed') || type.includes('approved')) return colors.status.success.fg;
    if (type.includes('rejected') || type.includes('cancelled')) return colors.status.danger.fg;
    if (type.includes('pending')) return colors.status.pending.fg;
    return colors.ink;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm } as TextStyle]}>
            Notifications
          </Text>
          <Text style={[type.body, { color: colors.muted } as TextStyle]}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Button
            label="Mark all read"
            variant="ghost"
            onPress={handleMarkAllRead}
            loading={markAllRead.isPending}
          />
        )}
      </View>

      {isLoading && (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      )}

      {!isLoading && notifications.length === 0 && (
        <View style={styles.emptyBox}>
          <Bell size={56} color={colors.muted} style={{ marginBottom: space.lg }} />
          <Text style={[type.h3, { color: colors.muted, textAlign: 'center' }]}>
            No notifications
          </Text>
          <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.md }]}>
            You're all caught up!
          </Text>
        </View>
      )}

      {!isLoading &&
        notifications.map((notif: any) => (
          <TouchableOpacity
            key={notif.id}
            style={[
              styles.notificationCard,
              shadow.card as object,
              !notif.read && styles.notificationUnread,
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconBg,
                  { backgroundColor: getNotificationColor(notif.type) + '20' },
                ]}
              >
                {notif.type.includes('confirmed') || notif.type.includes('approved') ? (
                  <Check size={20} color={getNotificationColor(notif.type)} />
                ) : notif.type.includes('rejected') || notif.type.includes('cancelled') ? (
                  <AlertCircle size={20} color={getNotificationColor(notif.type)} />
                ) : (
                  <Bell size={20} color={getNotificationColor(notif.type)} />
                )}
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text
                style={[
                  type.small,
                  {
                    color: colors.ink,
                    fontWeight: !notif.read ? '600' : '400',
                    marginBottom: space.xs,
                  },
                ]}
              >
                {notif.title}
              </Text>
              <Text
                style={[type.caption, { color: colors.muted, marginBottom: space.xs }]}
                numberOfLines={2}
              >
                {notif.body}
              </Text>
              <Text style={[type.caption, { color: colors.mutedSoft }]}>
                {new Date(notif.created_at).toLocaleDateString('en-AU')}
              </Text>
            </View>

            {!notif.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  emptyBox: {
    paddingVertical: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    gap: space.md,
  },
  notificationUnread: {
    backgroundColor: colors.pinkSoft,
  },
  cardLeft: {
    justifyContent: 'center',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pink,
    alignSelf: 'center',
  },
});
