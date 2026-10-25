import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius, space } from '@/theme';

interface ProgressProps {
  value: number; // 0-1
  color?: string;
  animated?: boolean;
}

export function Progress({ value, color = colors.pink, animated = true }: ProgressProps) {
  const width = useSharedValue(animated ? 0 : value);

  useEffect(() => {
    if (animated) {
      width.value = withTiming(value, { duration: 400 });
    } else {
      width.value = value;
    }
  }, [value, animated, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: '#EDF1EB' }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
