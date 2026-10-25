import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, type, space } from '@/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = colors.pink,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {/* Icon circle */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${accentColor}15` }, // 5% opacity
        ]}
      >
        <Icon size={48} color={accentColor} strokeWidth={1.5} />
      </View>

      {/* Content */}
      <Text style={[type.h3, { color: colors.ink, textAlign: 'center', marginVertical: space.md }]}>
        {title}
      </Text>

      {description && (
        <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    minHeight: 240,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
