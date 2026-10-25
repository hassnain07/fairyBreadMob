import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, type, space, radius } from '@/theme';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  if (isTablet) {
    // Horizontal layout for tablet
    return (
      <View style={styles.containerHorizontal}>
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <View key={index} style={styles.stepHorizontal}>
              <View
                style={[
                  styles.circleHorizontal,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                ]}
              >
                <Text
                  style={[
                    type.pill,
                    { color: isCompleted || isCurrent ? '#fff' : colors.muted },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  type.small,
                  {
                    color: isCompleted || isCurrent ? colors.ink : colors.muted,
                    marginTop: space.xs,
                    textAlign: 'center',
                  },
                ]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Compact vertical layout for phone
  return (
    <View style={styles.containerVertical}>
      <Text style={[type.caption, { color: colors.muted }]}>
        Step {currentStep + 1} of {steps.length}
      </Text>
      <Text style={[type.h3, { color: colors.ink, marginTop: space.xs }]}>
        {steps[currentStep]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  containerVertical: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  containerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    backgroundColor: colors.paper,
  },
  stepHorizontal: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: space.sm,
  },
  circleHorizontal: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  circleCurrent: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
});
