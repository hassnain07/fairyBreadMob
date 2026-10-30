/**
 * AppHeader — universal header for all roles (parent / teacher / admin).
 *
 * Variants:
 *  "root"   — Brand badge + wordmark left, bell + avatar right. Top-level tab screens.
 *  "detail" — Back arrow + screen title left, bell + avatar right. Pushed stack screens.
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
  variant?: 'root' | 'detail';
  title?: string;
  onBack?: () => void;
  onNotifications?: () => void;
  onAccount?: () => void;
  navigation?: any;
  route?: any;
  options?: any;
  back?: any;
  statusBarHeight?: number;
}

type RoleMeta = { color: string; soft: string; label: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_HEIGHT = 60;
const AVATAR_SIZE   = 36;
const ICON_BTN_SIZE = 40;
const HIT           = { top: 8, bottom: 8, left: 8, right: 8 };
const RIPPLE        = 'rgba(30, 42, 39, 0.07)';

/** Adds alpha to a #rrggbb colour. Returns the input unchanged for any other format. */
function withAlpha(color: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${color}${a}`;
  }
  return color;
}

function makeRole(base: string | undefined, label: string): RoleMeta {
  const color = base ?? colors.pink;
  return { color, soft: withAlpha(color, 0.12), label };
}

const ROLE_META: Record<string, RoleMeta> = {
  admin:   makeRole(colors.pink, 'Admin'),
  teacher: makeRole((colors as any).teal, 'Teacher'),
  parent:  makeRole((colors as any).green, 'Parent'),
};

// ─── Hooks / helpers ──────────────────────────────────────────────────────────

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
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
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
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      android_ripple={{ color: RIPPLE, borderless: true, radius: ICON_BTN_SIZE / 2 }}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <ArrowLeft size={22} color={colors.ink} strokeWidth={2.1} />
    </Pressable>
  );
});

const BellButton = memo(function BellButton({
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
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `Notifications, ${count} unread` : 'Notifications'}
      android_ripple={{ color: RIPPLE, borderless: true, radius: ICON_BTN_SIZE / 2 }}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Bell size={21} color={hasUnread ? colors.ink : colors.muted} strokeWidth={1.9} />
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
  meta,
  onPress,
}: {
  initials: string;
  meta: RoleMeta;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={`Account, ${meta.label}`}
      style={({ pressed }) => [
        styles.avatarBtn,
        { backgroundColor: meta.soft, borderColor: withAlpha(meta.color, 0.45) },
        pressed && styles.pressed,
      ]}
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
  statusBarHeight,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unread = useUnreadCount();

  const role     = (user as any)?.role ?? 'parent';
  const meta     = ROLE_META[role] ?? ROLE_META.parent;
  const fullName = user?.fullName?.trim() || user?.firstName || '';
  const initials = useMemo(() => getInitials(fullName), [fullName]);

  const handleBack =
    onBack ?? (navigation?.canGoBack?.() ? () => navigation.goBack() : undefined);

  const resolvedTitle = title ?? options?.title ?? '';

  const paddingTop =
    statusBarHeight !== undefined
      ? statusBarHeight
      : insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? 12
      : 0;

  return (
    <View style={[styles.container, { paddingTop }]}>
      <View style={styles.inner}>
        {/* ── Left ─────────────────────────────────────── */}
        {variant === 'root' ? (
          <View style={styles.left}>
            <Logo />
            <Text
              style={styles.brand}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.1}
              accessibilityRole="header"
            >
              Fairybread <Text style={styles.brandAmp}>&amp;</Text> Fractions
            </Text>
          </View>
        ) : (
          <View style={[styles.left, styles.detailLeft]}>
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
          <BellButton onPress={onNotifications} count={unread} />
          <AvatarButton initials={initials} meta={meta} onPress={onAccount} />
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
        shadowColor:   '#1E2A27',
        shadowOpacity: 0.05,
        shadowRadius:  10,
        shadowOffset:  { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },

  // Symmetric horizontal padding so nothing touches the screen edge.
  inner: {
    height:            HEADER_HEIGHT,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: space.md,
    gap:               space.sm,
  },

  // Left region takes the remaining space and may shrink; actions never do.
  left: {
    flex:          1,
    minWidth:      0,
    flexDirection: 'row',
    alignItems:    'center',
  },

  // ── Root: logo ─────────────────────────────────────────────────────────────
  // The logo is a square round badge — keep it square and pinned to the left.
  logo: {
    width:        40,
    height:       40,
    borderRadius: 20,
    marginRight:  10,
    flexShrink:   0,
  },
  brand: {
    flex:          1,
    fontFamily:    'DMSans-Bold',
    fontSize:      17,
    lineHeight:    22,
    letterSpacing: -0.3,
    color:         colors.ink,
    includeFontPadding: false,
  },
  brandAmp: {
    color:      colors.pink,
    fontFamily: 'DMSans-Bold',
  },

  // ── Detail: back + title ───────────────────────────────────────────────────
  detailLeft: {
    gap:        space.xs,
    marginLeft: -8, // optically align the arrow glyph with the content edge
  },
  detailTitle: {
    flex:          1,
    fontFamily:    'DMSans-SemiBold',
    fontSize:      18,
    lineHeight:    24,
    letterSpacing: -0.3,
    color:         colors.ink,
  },

  // ── Right actions ──────────────────────────────────────────────────────────
  actions: {
    flexShrink:    0,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space.xs,
  },

  // Ghost icon button (back + bell)
  iconBtn: {
    width:          ICON_BTN_SIZE,
    height:         ICON_BTN_SIZE,
    borderRadius:   ICON_BTN_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'visible',
  },
  pressed: {
    opacity:   0.7,
    transform: [{ scale: 0.95 }],
  },

  // Unread badge
  badge: {
    position:          'absolute',
    top:               3,
    right:             1,
    minWidth:          17,
    height:            17,
    borderRadius:      9,
    paddingHorizontal: 4,
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   colors.pink,
    borderWidth:       2,
    borderColor:       colors.card,
  },
  badgeWide: {
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily:         'DMSans-Bold',
    fontSize:           9,
    lineHeight:         11,
    color:              '#FFFFFF',
    textAlign:          'center',
    fontVariant:        ['tabular-nums'],
    includeFontPadding: false,
  },

  // Avatar
  avatarBtn: {
    width:          AVATAR_SIZE,
    height:         AVATAR_SIZE,
    borderRadius:   AVATAR_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1.5,
  },
  avatarText: {
    fontFamily:         'DMSans-Bold',
    fontSize:           13,
    lineHeight:         16,
    letterSpacing:      0.3,
    color:              colors.ink,
    includeFontPadding: false,
  },
});