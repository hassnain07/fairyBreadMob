import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius, shadow, space } from '@/theme';
import type { Accent } from '@/theme';
import { accent as accentHelper } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  accent?: Accent;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const AP = Animated.createAnimatedComponent(Pressable);

export function Card({ children, accent, onPress, style, testID }: CardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const accentColor = accent ? accentHelper(accent).color : undefined;
  const accentSoftColor = accent ? accentHelper(accent).soft : undefined;

  const Component = onPress ? AP : View;

  return (
    <Component
      testID={testID}
      {...(onPress && {
        onPress,
        onPressIn: () => { scale.value = withTiming(0.985, { duration: 100 }); },
        onPressOut: () => { scale.value = withTiming(1, { duration: 120 }); },
      })}
      style={[
        styles.base,
        accentSoftColor && { backgroundColor: accentSoftColor },
        onPress && animStyle,
        style,
      ]}
    >
      {accentColor && <View style={[styles.accentBar, { backgroundColor: accentColor }]} />}
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#EEF1ED',
    padding: space.lg,
    ...shadow.card,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.card,
    borderBottomLeftRadius: radius.card,
  },
});
