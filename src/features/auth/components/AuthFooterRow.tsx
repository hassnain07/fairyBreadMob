import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, type, space } from '@/theme';

interface AuthFooterRowProps {
  prompt: string;
  linkLabel: string;
  onPress: () => void;
}

export function AuthFooterRow({ prompt, linkLabel, onPress }: AuthFooterRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.prompt}>{prompt} </Text>
      <TouchableOpacity onPress={onPress} hitSlop={8}>
        <Text style={styles.link}>{linkLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    flexWrap:       'wrap',
    marginTop:      space.sm,
  },
  prompt: {
    ...type.small,
    color: colors.muted,
  },
  link: {
    ...type.small,
    color:      colors.pink,
    fontWeight: '700',
  },
});
