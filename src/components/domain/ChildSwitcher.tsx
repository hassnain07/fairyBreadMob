import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, type, space, radius } from '@/theme';
import { Avatar } from '../ui/Avatar';
import type { Child } from '@/types/family';

interface ChildSwitcherProps {
  children: Child[];
  selectedChildId?: string;
  onSelectChild: (child: Child) => void;
}

export function ChildSwitcher({ children, selectedChildId, onSelectChild }: ChildSwitcherProps) {
  // Only show if multiple children
  if (children.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      scrollEventThrottle={16}
    >
      {children.map((child) => {
        const isActive = selectedChildId === child.id;
        return (
          <TouchableOpacity
            key={child.id}
            onPress={() => onSelectChild(child)}
            style={[
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
            ]}
            activeOpacity={0.7}
          >
            <Avatar initials={child.initials} size={32} />
            <Text
              style={[
                type.small,
                {
                  color: isActive ? colors.pink : colors.ink,
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {child.givenName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.pinkSoft,
    borderColor: colors.pink,
  },
  chipInactive: {
    backgroundColor: colors.card,
    borderColor: colors.line,
  },
});
