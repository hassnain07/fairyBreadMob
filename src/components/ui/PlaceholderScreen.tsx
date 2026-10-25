import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, type, space } from '@/theme';

interface PlaceholderScreenProps {
  title: string;
  icon?: string;
}

export function PlaceholderScreen({ title, icon }: PlaceholderScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.empty}>
        <Text style={styles.emoji}>{icon || '🚀'}</Text>
        <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, textAlign: 'center' }]}>
          {title}
        </Text>
        <Text style={[type.body, { color: colors.muted, marginTop: space.md, textAlign: 'center' }]}>
          Coming soon
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  empty: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
  },
});
