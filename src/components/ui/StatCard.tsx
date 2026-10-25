import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, type, space, shadow } from '@/theme';
import type { Accent } from '@/theme';
import { accent as accentHelper } from '@/theme';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: Accent;
  trend?: number; // percentage change
}

export function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  const acc = accentHelper(accent);

  return (
    <View style={[styles.base, { ...shadow.card }]}>
      {/* Icon tile */}
      <View
        style={[
          styles.iconTile,
          { backgroundColor: acc.soft },
        ]}
      >
        <Icon size={20} color={acc.color} strokeWidth={2.5} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[type.bodyStrong, { color: colors.ink }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Bottom accent line */}
      <View
        style={[
          styles.accentLine,
          { backgroundColor: acc.color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#EEF1ED',
    padding: space.lg,
    paddingBottom: space.md,
  },
  iconTile: {
    width: 31,
    height: 31,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  content: {
    gap: space.xs,
  },
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
});
