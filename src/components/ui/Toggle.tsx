import React from 'react';
import { Switch, SwitchProps, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface ToggleProps extends SwitchProps {
  testID?: string;
}

export function Toggle({ value, onValueChange, testID, disabled, ...props }: ToggleProps) {
  return (
    <Switch
      testID={testID}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.surface, true: colors.pinkSoft }}
      thumbColor={value ? colors.pink : colors.muted}
      ios_backgroundColor={colors.surface}
      {...props}
    />
  );
}
