import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radius, space } from '@/theme';

interface CheckboxProps {
  checked: boolean;
  onToggle?: (checked: boolean) => void;
  testID?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onToggle,
  testID,
  style,
  disabled,
}: CheckboxProps) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!disabled) {
          onToggle?.(!checked);
        }
      }}
      disabled={disabled}
      style={[styles.base, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      hitSlop={8}
    >
      <View
        style={[
          styles.box,
          checked && { backgroundColor: colors.green },
          !checked && { borderColor: '#C8D6CF' },
          disabled && { opacity: 0.5 },
        ]}
      >
        {checked && <Check size={16} color="#fff" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: space.sm,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
