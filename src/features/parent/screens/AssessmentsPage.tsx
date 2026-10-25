import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AssessmentsPage({ navigation }: any) {
  const { familyId } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: assessments = [], isLoading, refetch } = useQuery({
    queryKey: ['assessments', familyId],
    queryFn: () => dataClient.getAssessments?.(familyId || '') || Promise.resolve([]),
    enabled: !!familyId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Group assessments into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];

    assessments.forEach((a: any) => {
      const date = new Date(a.scheduled_date || '');
      if (date > now && a.status !== 'cancelled') {
        upcoming.push(a);
      } else {
        past.push(a);
      }
    });

    return {
      upcoming: upcoming.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()),
      past: past.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()),
    };
  }, [assessments]);

  const renderAssessmentCard = (assessment: any) => {
    const isInitial = !assessment.session_id;
    const dateStr = assessment.scheduled_date 
      ? new Date(assessment.scheduled_date).toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short' })
      : 'TBC';
    
    const statusMap: Record<string, { bg: string; fg: string }> = {
      scheduled: colors.status.pending,
      completed: colors.status.success,
      cancelled: colors.status.danger,
    };
    const status = statusMap[assessment.status] || colors.status.info;

    return (
      <View key={assessment.id} style={[styles.card, shadow.card as object]}>
        <View style={styles.cardContent}>
          <View style={[styles.dateBlock, { backgroundColor: isInitial ? colors.pink : colors.teal }]}>
            <Text style={[type.eyebrow, { color: '#fff', textAlign: 'center' }]}>
              {dateStr.split(' ')[0]}
            </Text>
            <Text style={[type.h3, { color: '#fff', textAlign: 'center' }]}>
              {dateStr.split(' ')[1]}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: space.lg }}>
            <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
              {isInitial ? 'Initial Assessment' : 'Term Assessment'}
            </Text>
            <Text style={[type.h3, { color: colors.ink, marginTop: space.xs }]}>
              {assessment.child_name}
            </Text>
            {assessment.scheduled_time && (
              <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                {assessment.scheduled_time}
              </Text>
            )}
            {assessment.tutor_name && (
              <Text style={[type.small, { color: colors.muted }]}>
                with {assessment.tutor_name}
              </Text>
            )}
          </View>

          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[type.pill, { color: status.fg }]}>
              {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const isEmpty = upcoming.length === 0 && past.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        My Assessments
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Track upcoming and past assessments for your children.
      </Text>

      {isLoading ? (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
            No assessments yet. Book an initial assessment to get started.
          </Text>
          <Button label="Book assessment →" onPress={() => navigation.navigate('BookAssessment')} />
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Upcoming
              </Text>
              <View style={{ gap: space.md }}>
                {upcoming.map(renderAssessmentCard)}
              </View>
            </View>
          )}

          {past.length > 0 && (
            <View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Past
              </Text>
              <View style={{ gap: space.md }}>
                {past.map(renderAssessmentCard)}
              </View>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBlock: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    marginLeft: space.md,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
