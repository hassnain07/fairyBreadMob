/**
 * AppHeader — universal header for all roles (parent / teacher / admin).
 *
 * Variants (via `variant` prop):
 *
 *  "root"   (default) — Brand logo on the left. Top-level tab screens.
 *  "detail"           — Back button + screen title on the left. Pushed stack screens.
 *
 * Right side (both variants): notification bell with unread badge + account avatar.
 *
 * ── Usage as a React Navigation header option ────────────────────────────
 *
 *   header: (props) => (
 *     <AppHeader {...props} variant="root" onNotifications={...} onAccount={...} />
 *   )
 *
 *   header: (props) => (
 *     <AppHeader {...props} variant="detail" onNotifications={...} onAccount={...} />
 *   )
 */

import React, { memo, useMemo } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, space } from '@/theme';
import { useAuth } from '@/app/_providers';
import { dataClient } from '@/lib/data/client';
import type { Notification } from '@/types/message';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppHeaderProps {
  /** "root" → logo (top-level tabs) · "detail" → back + title (pushed screens) */
  variant?: 'root' | 'detail';

  /** Title for the "detail" variant. Falls back to `options.title`. */
  title?: string;

  /** Called when the back button is pressed. Falls back to `navigation.goBack`. */
  onBack?: () => void;

  /** Called when the bell is pressed. */
  onNotifications?: () => void;

  /** Called when the avatar is pressed. */
  onAccount?: () => void;

  // Injected automatically by React Navigation
  navigation?: any;
  route?: any;
  options?: any;
  back?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_HEIGHT = 56;
const BUTTON_SIZE = 40;
const HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };
const PRESSED_BG = 'rgba(30, 42, 39, 0.06)';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useUnreadCount(): number {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', 20],
    queryFn: () => dataClient.getNotifications?.(20) ?? Promise.resolve([]),
    staleTime: 30_000,
  });
  return useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Logo = memo(function Logo() {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('@/assets/brand/logo.png')}
      style={styles.logo}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Fairybread & Fractions"
    />
  );
});

const BackButton = memo(function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      android_ripple={{ color: PRESSED_BG, borderless: true, radius: BUTTON_SIZE / 2 }}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
    >
      <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
    </Pressable>
  );
});

const NotificationButton = memo(function NotificationButton({
  onPress,
  count,
}: {
  onPress?: () => void;
  count: number;
}) {
  const hasUnread = count > 0;
  const label = count > 99 ? '99+' : String(count);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `Notifications, ${count} unread` : 'Notifications'}
      android_ripple={{ color: PRESSED_BG, borderless: true, radius: BUTTON_SIZE / 2 }}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
    >
      <Bell
        size={21}
        color={hasUnread ? colors.ink : colors.muted}
        strokeWidth={1.9}
      />
      {hasUnread && (
        <View
          style={[styles.badge, count > 9 && styles.badgeWide]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

const AvatarButton = memo(function AvatarButton({
  initials,
  onPress,
}: {
  initials: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Account"
      style={({ pressed }) => [styles.avatarBtn, pressed && styles.avatarBtnPressed]}
    >
      <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
        {initials}
      </Text>
    </Pressable>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export function AppHeader({
  variant = 'root',
  title,
  onBack,
  onNotifications,
  onAccount,
  navigation,
  options,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unread = useUnreadCount();

  const fullName = user?.fullName?.trim() || user?.firstName || '';
  const initials = useMemo(() => getInitials(fullName), [fullName]);

  // Resolve back handler: explicit prop → navigation.goBack → none
  const handleBack =
    onBack ?? (navigation?.canGoBack?.() ? () => navigation.goBack() : undefined);

  const resolvedTitle = title ?? options?.title ?? '';

  // Safe-area top padding applies to the root variant only. Detail headers
  // inside a stack navigator already have the status bar offset handled.
  const paddingTop =
    variant === 'root'
      ? insets.top > 0
        ? insets.top
        : Platform.OS === 'android'
        ? 12
        : 0
      : 0;

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.inner}>
        {/* ── Left ─────────────────────────────────────── */}
        {variant === 'root' ? (
          <Logo />
        ) : (
          <View style={styles.detailLeft}>
            {handleBack ? <BackButton onPress={handleBack} /> : null}
            {resolvedTitle ? (
              <Text
                style={styles.detailTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.2}
                accessibilityRole="header"
              >
                {resolvedTitle}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Right ────────────────────────────────────── */}
        <View style={styles.actions}>
          <NotificationButton onPress={onNotifications} count={unread} />
          <AvatarButton initials={initials} onPress={onAccount} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#1E2A27',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  inner: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    gap: space.md,
  },

  // Root — logo
  logo: {
    height: 30,
    width: 140,
  },

  // Detail — back + title
  detailLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minWidth: 0,
    // Optically align the back arrow with the screen's content edge.
    marginLeft: -space.sm,
  },
  detailTitle: {
    flex: 1,
    fontFamily: 'DMSans-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.35,
    color: colors.ink,
  },

  // Right actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 0,
  },

  // Ghost icon button (back + bell)
  iconBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconBtnPressed: {
    backgroundColor: PRESSED_BG,
  },

  // Unread badge
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeWide: {
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    lineHeight: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },

  // Avatar
  avatarBtn: {
    width: BUTTON_SIZE - 2,
    height: BUTTON_SIZE - 2,
    borderRadius: (BUTTON_SIZE - 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space.xs,
    backgroundColor: colors.avatar.pink.bg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.line,
  },
  avatarBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: colors.avatar.pink.fg,
    includeFontPadding: false,
  },
});