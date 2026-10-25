import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { dataClient } from '@/lib/data/client';
import type { NotificationCategory } from '@/types/message';

const NOTIFICATION_CATEGORIES: Array<{ key: NotificationCategory; label: string }> = [
  { key: 'new_bookings', label: 'New bookings' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'payments', label: 'Payment activity' },
  { key: 'reports', label: 'Weekly report summary' },
  { key: 'reminders', label: 'Session reminders' },
  { key: 'messages', label: 'Messages' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'orders', label: 'Shop orders' },
];

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [localPrefs, setLocalPrefs] = useState<Record<NotificationCategory, { push: boolean; inApp: boolean }> | null>(null);

  // Load notification preferences
  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['notificationPrefs'],
    queryFn: async () => {
      const result = await dataClient.getNotificationPrefs?.();
      return result || ({} as Record<NotificationCategory, { push: boolean; inApp: boolean }>);
    },
  });

  const prefs: Record<NotificationCategory, { push: boolean; inApp: boolean }> = prefsData || ({} as any);

  // Update preference mutation
  const updateMutation = useMutation({
    mutationFn: async ({ category, push, inApp }: { category: NotificationCategory; push?: boolean; inApp?: boolean }) => {
      await dataClient.setNotificationPref?.(category, { push, inApp });
    },
  });

  // Use local state if available, otherwise use server state
  const currentPrefs = localPrefs || prefs;

  const handleTogglePush = (category: NotificationCategory) => {
    const current = currentPrefs[category];
    const newValue = !current.push;
    setLocalPrefs({ ...currentPrefs, [category]: { ...current, push: newValue } });
    updateMutation.mutate({ category, push: newValue });
  };

  const handleToggleInApp = (category: NotificationCategory) => {
    const current = currentPrefs[category];
    const newValue = !current.inApp;
    setLocalPrefs({ ...currentPrefs, [category]: { ...current, inApp: newValue } });
    updateMutation.mutate({ category, inApp: newValue });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
          Account
        </Text>

        <View style={[styles.card, shadow.card as object]}>
          <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
            Profile
          </Text>
          <Text style={[type.h3, { color: colors.ink, marginTop: space.sm }]}>
            {user?.fullName}
          </Text>
          <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
            {user?.email}
          </Text>
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
          Notification Preferences
        </Text>
        <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
          Customize how you receive updates about bookings, payments, and more.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.pink} size="large" />
        ) : (
          <View style={styles.preferencesContainer}>
            {NOTIFICATION_CATEGORIES.map(({ key, label }) => {
              const pref = currentPrefs[key];
              if (!pref) return null;

              return (
                <View key={key} style={styles.preferenceRow}>
                  <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                    {label}
                  </Text>

                  <View style={styles.toggles}>
                    {/* Push toggle */}
                    <View style={styles.toggle}>
                      <Text style={[type.caption, { color: colors.muted, marginRight: space.sm }]}>
                        Push
                      </Text>
                      <Switch
                        value={pref.push}
                        onValueChange={() => handleTogglePush(key)}
                        trackColor={{ false: colors.line, true: '#C9EBCE' }}
                        thumbColor={pref.push ? colors.green : colors.muted}
                        disabled={updateMutation.isPending}
                      />
                    </View>

                    {/* In-app toggle */}
                    <View style={styles.toggle}>
                      <Text style={[type.caption, { color: colors.muted, marginRight: space.sm }]}>
                        In-app
                      </Text>
                      <Switch
                        value={pref.inApp}
                        onValueChange={() => handleToggleInApp(key)}
                        trackColor={{ false: colors.line, true: '#C9EBCE' }}
                        thumbColor={pref.inApp ? colors.green : colors.muted}
                        disabled={updateMutation.isPending}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.signOutButton, shadow.card as object]}
          onPress={handleSignOut}
        >
          <LogOut size={18} color={colors.ink} />
          <Text style={[type.button, { color: colors.ink, marginLeft: space.md }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: space.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  section: {
    marginBottom: space.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  preferencesContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toggles: {
    flexDirection: 'row',
    gap: space.lg,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    paddingVertical: space.md,
    marginTop: space.lg,
  },
});
