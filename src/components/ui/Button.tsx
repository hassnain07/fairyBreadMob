import React, { useMemo } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, AccessibilityRole } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, type, space } from '@/theme';
import { triggerHaptic } from '@/lib/haptics';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const AP = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  fullWidth,
  testID,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const variants: Record<Variant, { box: ViewStyle; fg: string }> = useMemo(() => ({
    primary: { box: { backgroundColor: colors.pink }, fg: '#fff' },
    secondary: { box: { backgroundColor: '#fff' }, fg: colors.ink },
    soft: { box: { backgroundColor: colors.surface }, fg: colors.ink },
    ghost: { box: { backgroundColor: 'transparent' }, fg: colors.ink },
    danger: { box: { backgroundColor: '#E85A5A' }, fg: '#fff' },
  }), []);

  const v = variants[variant];
  const isDisabled = disabled || loading;

  return (
    <AP
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        console.log('🟢 Button.onPress fired - label:', label);
        triggerHaptic('light');
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        styles.base,
        variant === 'ghost' && styles.ghost,
        v.box,
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && { opacity: 0.45 },
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          <Text style={[type.button, { color: v.fg }]} maxFontSizeMultiplier={1.3}>
            {label}
          </Text>
          {Icon && <Icon size={17} color={v.fg} strokeWidth={2.5} />}
        </>
      )}
    </AP>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  ghost: {
    paddingHorizontal: space.sm,
    minHeight: 40,
  },
});
