import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, space } from '@/theme';
import type { Accent } from '@/theme';

type AvatarSize = 32 | 38 | 44 | 56 | 64;
type AvatarVariant = 'round' | 'square';

interface AvatarProps {
  initials: string;
  accent?: Accent;
  size?: AvatarSize;
  variant?: AvatarVariant;
  testID?: string;
}

export function Avatar({
  initials,
  accent = 'pink',
  size = 44,
  variant = 'round',
  testID,
}: AvatarProps) {
  const accentPairs: Record<Accent, { bg: string; fg: string }> = {
    pink: { bg: colors.avatar.pink.bg, fg: colors.avatar.pink.fg },
    teal: { bg: colors.avatar.teal.bg, fg: colors.avatar.teal.fg },
    yellow: { bg: colors.avatar.yellow.bg, fg: colors.avatar.yellow.fg },
    orange: { bg: colors.avatar.orange.bg, fg: colors.avatar.orange.fg },
    green: { bg: colors.avatar.green.bg, fg: colors.avatar.green.fg },
    magenta: { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
  };

  const pair = accentPairs[accent];
  const isRound = variant === 'round';
  const borderRadius = isRound ? size / 2 : 13;

  // Scale font size proportionally with avatar size
  const fontSize = Math.max(10, size * 0.38);

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: pair.bg,
        },
      ]}
      accessibilityLabel={`Avatar: ${initials}`}
    >
      <Text
        style={[
          type.bodyStrong,
          { fontSize, color: pair.fg, lineHeight: fontSize },
        ]}
      >
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
