import React from 'react';
import { View, Text, StyleSheet, TextStyle, TouchableOpacity } from 'react-native';
import { AlertCircle, Zap } from 'lucide-react-native';
import { colors, type as typeTokens, space, radius } from '@/theme';

interface UnlockBannerProps {
  type: 'no_term' | 'expiring' | 'expired';
  onAction?: () => void;
}

interface BannerConfig {
  icon: React.ComponentType<any>;
  title: string;
  body: string;
  actionLabel: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

const bannerConfig: Record<'no_term' | 'expiring' | 'expired', BannerConfig> = {
  no_term: {
    icon: Zap,
    title: 'Get started with Fairybread',
    body: 'Purchase a term to book classes and track your children\'s progress.',
    actionLabel: 'View membership →',
    bgColor: '#FFF8DF',
    borderColor: '#FAEBAC',
    textColor: colors.ink,
    iconColor: '#AD8917',
  },
  expiring: {
    icon: AlertCircle,
    title: 'Your term is ending soon',
    body: 'Make the most of your remaining time! Renew your membership to keep learning.',
    actionLabel: 'Renew now →',
    bgColor: '#FFF8DF',
    borderColor: '#FAEBAC',
    textColor: colors.ink,
    iconColor: '#AD8917',
  },
  expired: {
    icon: AlertCircle,
    title: 'Your term has expired',
    body: 'Renew your membership to continue booking classes.',
    actionLabel: 'Renew membership →',
    bgColor: '#FFF0E9',
    borderColor: '#FBDCC9',
    textColor: colors.ink,
    iconColor: '#D46831',
  },
};

export function UnlockBanner({ type, onAction }: UnlockBannerProps) {
  const config = bannerConfig[type];
  const Icon = config.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Icon size={24} color={config.iconColor} />
        </View>
        <View style={styles.text}>
          <Text style={[typeTokens.h3, { color: config.textColor, marginBottom: space.xs } as TextStyle]}>
            {config.title}
          </Text>
          <Text style={[typeTokens.small, { color: colors.muted } as TextStyle]}>
            {config.body}
          </Text>
        </View>
      </View>

      {onAction && (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={[typeTokens.small, { color: colors.pink, fontWeight: '600' } as TextStyle]}>
            {config.actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  content: {
    flexDirection: 'row',
    gap: space.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  text: {
    flex: 1,
  },
  action: {
    paddingVertical: space.sm,
  },
});
