import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, space, radius } from '@/theme';
import { Progress } from '../ui/Progress';
import type { Term } from '@/types/term';
import { termWeeksRemaining, isTermExpiringSoon } from '@/lib/utils/termUtils';

interface TermCreditMeterProps {
  /** The active term — weeks remaining are derived from its end_date. */
  term: Term;
}

const TOTAL_WEEKS = 10;

export function TermCreditMeter({ term }: TermCreditMeterProps) {
  const weeksLeft = Math.min(termWeeksRemaining(term), TOTAL_WEEKS);
  const weeksDone = Math.max(0, TOTAL_WEEKS - weeksLeft);
  const pct = (weeksDone / TOTAL_WEEKS) * 100;
  const expiringSoon = isTermExpiringSoon(term);

  return (
    <View style={styles.container}>
      {/* Header row: weeks done / weeks remaining */}
      <View style={styles.header}>
        <Text style={styles.mainLabel} maxFontSizeMultiplier={1.15}>
          {weeksDone} of {TOTAL_WEEKS} weeks done
          {term.term_label ? (
            <Text style={styles.termLabelBadge}> · {term.term_label}</Text>
          ) : null}
        </Text>
        <Text style={styles.usedLabel}>
          {weeksLeft} week{weeksLeft !== 1 ? 's' : ''} remaining
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <Progress value={pct / 100} color={colors.teal} />
      </View>

      {/* Week dots — one per week, filled = done */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, i < weeksDone && styles.dotDone]}
          />
        ))}
      </View>

      {/* Expiring soon warning */}
      {expiringSoon && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠ Your term ends in {weeksLeft} week{weeksLeft !== 1 ? 's' : ''}. Renew soon to keep your classes.
          </Text>
        </View>
      )}
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
    gap: space.md,
  },
  header: {
    gap: 2,
  },
  mainLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  termLabelBadge: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  usedLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  progressWrap: {
    marginVertical: space.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dotDone: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  warning: {
    marginTop: space.xs,
    backgroundColor: colors.yellowSoft,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.yellow,
  },
  warningText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.ink,
    lineHeight: 18,
  },
});
