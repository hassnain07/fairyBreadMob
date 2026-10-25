import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDistance, format } from 'date-fns';
import { enAU } from 'date-fns/locale';
import { colors, type, space, radius } from '@/theme';
import { Progress } from '../ui/Progress';

interface TermCreditMeterProps {
  creditsRemaining: number;
  creditsTotal?: number;
  endDate?: string;
}

export function TermCreditMeter({ creditsRemaining, creditsTotal = 10, endDate }: TermCreditMeterProps) {
  const progressPercent = creditsTotal > 0 ? creditsRemaining / creditsTotal : 0;
  
  const endDateObj = endDate ? new Date(endDate) : null;
  const timeRemaining = endDateObj 
    ? formatDistance(new Date(), endDateObj, { locale: enAU, addSuffix: true })
    : 'N/A';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[type.h3, { color: colors.ink }]}>
          {creditsRemaining} class credits remaining
        </Text>
        <Text style={[type.small, { color: colors.muted }]}>
          out of {creditsTotal}
        </Text>
      </View>

      <View style={styles.progress}>
        <Progress
          value={progressPercent}
          color={creditsRemaining > 2 ? colors.pink : colors.orange}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[type.small, { color: colors.muted }]}>
          Term ends {endDateObj ? format(endDateObj, 'EEEE d MMMM', { locale: enAU }) : 'N/A'}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          {timeRemaining}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.lg,
  },
  header: {
    marginBottom: space.md,
  },
  progress: {
    marginBottom: space.lg,
  },
  footer: {
    gap: 4,
  },
});
