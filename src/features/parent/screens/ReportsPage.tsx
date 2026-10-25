import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function ReportsPage() {
  const { familyId } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children', familyId],
    queryFn: () => dataClient.getChildren?.(familyId || '') || Promise.resolve([]),
    enabled: !!familyId,
  });

  const firstEnrolledChild = children.find(c => c.enrolled);
  const activeChildId = selectedChildId || firstEnrolledChild?.id;

  const { data: reports = [], isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ['reports', activeChildId],
    queryFn: () => activeChildId ? dataClient.getReportsForChild?.(activeChildId) || Promise.resolve([]) : Promise.resolve([]),
    enabled: !!activeChildId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const latestReport = reports[0];
  const enrolledChildren = children.filter(c => c.enrolled);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            fill={i < Math.round(rating) ? colors.pink : colors.line}
            color={i < Math.round(rating) ? colors.pink : colors.line}
            style={{ marginRight: space.xs }}
          />
        ))}
      </View>
    );
  };

  const selectedChild = children.find(c => c.id === activeChildId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase', marginBottom: space.sm }]}>
          {latestReport?.term_label || 'End of Term Report'}
        </Text>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.md }]}>
          {selectedChild?.givenName}'s learning journey
        </Text>
        <Text style={[type.small, { color: colors.muted }]}>
          A thoughtful look at all the progress they've made.
        </Text>

        {latestReport && (
          <View style={styles.scoreBox}>
            <Text style={[type.display, { color: colors.pink, textAlign: 'center' }]}>
              {((latestReport as any)?.overall_rating || 3).toFixed(1)}
            </Text>
            <Text style={[type.caption, { color: colors.muted, textAlign: 'center' }]}>
              Overall progress
            </Text>
            {renderStars(latestReport.overall_rating || 3)}
          </View>
        )}
      </View>

      {/* Child Switcher */}
      {enrolledChildren.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.childSwitcher}
          contentContainerStyle={styles.childSwitcherContent}
        >
          {enrolledChildren.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childChip,
                activeChildId === child.id && styles.childChipActive,
              ]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text style={[type.small, { color: activeChildId === child.id ? '#fff' : colors.ink }]}>
                {child.givenName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {reportsLoading ? (
        <View style={{ gap: space.lg, marginTop: space.lg }}>
          <Skeleton height={120} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : !latestReport ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No reports have been written yet. Reports will appear here after each term.
          </Text>
        </View>
      ) : (
        <>
          {/* Learning Snapshot */}
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Learning snapshot
            </Text>

            {/* Per-subject ratings */}
            {latestReport && Object.entries((latestReport as any)?.subject_ratings || {}).map(([subject, rating]: [string, any]) => (
              <View key={subject} style={styles.subjectRow}>
                <Text style={[type.small, { color: colors.ink, flex: 1 }]}>
                  {subject}
                </Text>
                {renderStars(rating)}
              </View>
            ))}
          </View>

          {/* Tutor Note */}
          {(latestReport as any)?.tutor_note && (
            <View style={[styles.card, shadow.card as object]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
                <Text style={[type.h3, { color: colors.ink }]}>✦ Tutor note</Text>
              </View>
              <Text style={[type.small, { color: colors.muted, fontStyle: 'italic' }]}>
                "{(latestReport as any).tutor_note}"
              </Text>
              {(latestReport as any)?.tutor_name && (
                <Text style={[type.caption, { color: colors.muted, marginTop: space.md }]}>
                  {(latestReport as any).tutor_name}'s tutor
                </Text>
              )}
            </View>
          )}

          {/* Strengths */}
          {(latestReport as any)?.strengths && (
            <View style={[styles.card, styles.cardGreen, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.green, marginBottom: space.lg }]}>
                ★ Strengths
              </Text>
              <Text style={[type.small, { color: colors.ink }]}>
                {(latestReport as any).strengths}
              </Text>
            </View>
          )}

          {/* Areas to Continue */}
          {(latestReport as any)?.areas_to_continue && (
            <View style={[styles.card, styles.cardOrange, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.orange, marginBottom: space.lg }]}>
                → Areas to continue
              </Text>
              <Text style={[type.small, { color: colors.ink }]}>
                {(latestReport as any).areas_to_continue}
              </Text>
            </View>
          )}

          {/* Report History */}
          {reports.length > 1 && (
            <View style={[styles.card, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Report history
              </Text>
              {reports.map(report => (
                <View key={report.id} style={styles.historyRow}>
                  <Text style={[type.small, { color: colors.ink, flex: 1 }]}>
                    {report.term_label}
                  </Text>
                  {renderStars(report.overall_rating || 3)}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  heroCard: {
    backgroundColor: '#EAF8F6',
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.xl,
  },
  scoreBox: {
    marginTop: space.lg,
    alignItems: 'center',
  },
  childSwitcher: {
    marginBottom: space.lg,
  },
  childSwitcherContent: {
    gap: space.md,
  },
  childChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  childChipActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardGreen: {
    backgroundColor: '#EDF9EF',
    borderColor: '#C9EBCE',
  },
  cardOrange: {
    backgroundColor: '#FFF0E9',
    borderColor: '#FFD2B9',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: space.sm,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
