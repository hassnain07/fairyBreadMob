import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function AdminAssessmentsPage() {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: assessments = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-assessments'],
    queryFn: () => dataClient.getTeacherAssessments?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const pending = assessments.filter((a: any) => a.status !== 'completed');
  const completed = assessments.filter((a: any) => a.status === 'completed');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Assessments
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Monitor student learning assessments.
      </Text>

      {isLoading ? (
        <Skeleton height={100} borderRadius={radius.card} />
      ) : (
        <>
          {pending.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Pending ({pending.length})
              </Text>
              <View style={{ gap: space.md }}>
                {pending.map((a: any) => (
                  <View key={a.id} style={[styles.card, shadow.card as object]}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {a.child_name}
                    </Text>
                    <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                      {a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString('en-AU') : 'TBC'}
                    </Text>
                    <Text style={[type.small, { color: colors.muted }]}>
                      with {a.tutor_name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {completed.length > 0 && (
            <View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Completed ({completed.length})
              </Text>
              <View style={{ gap: space.md }}>
                {completed.map((a: any) => (
                  <View key={a.id} style={[styles.card, shadow.card as object]}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {a.child_name} ✓
                    </Text>
                    <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                      {new Date(a.scheduled_date || '').toLocaleDateString('en-AU')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {assessments.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
                No assessments.
              </Text>
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
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
