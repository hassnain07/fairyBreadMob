import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, type, space } from '@/theme';

type PillVariant = 'success' | 'pending' | 'danger' | 'info' | 'neutral';

interface PillProps {
  label: string;
  variant?: PillVariant;
  icon?: LucideIcon;
  size?: 'small' | 'medium';
}

export function Pill({ label, variant = 'neutral', icon: Icon, size = 'medium' }: PillProps) {
  const variants: Record<PillVariant, { bg: string; fg: string }> = {
    success: { bg: colors.status.success.bg, fg: colors.status.success.fg },
    pending: { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
    danger: { bg: colors.status.danger.bg, fg: colors.status.danger.fg },
    info: { bg: colors.status.info.bg, fg: colors.status.info.fg },
    neutral: { bg: colors.status.neutral.bg, fg: colors.status.neutral.fg },
  };

  const v = variants[variant];
  const iconSize = size === 'small' ? 12 : 14;
  const padding = size === 'small' ? 4 : 6;

  return (
    <View style={[styles.base, { backgroundColor: v.bg, paddingHorizontal: padding, paddingVertical: 3 }]}>
      {Icon && <Icon size={iconSize} color={v.fg} strokeWidth={2.5} />}
      <Text style={[type.pill, { color: v.fg }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
});
