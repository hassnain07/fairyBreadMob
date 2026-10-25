import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function TeacherAssessmentsPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: assessments = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: () => dataClient.getTeacherAssessments?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const updateAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await dataClient.updateAssessment?.(id, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
    },
  });

  const upcoming = assessments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const completed = assessments.filter(a => a.status === 'completed' || a.status === 'cancelled');

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
        Manage student learning assessments.
      </Text>

      {isLoading ? (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Upcoming
              </Text>
              <View style={{ gap: space.md }}>
                {upcoming.map(assessment => (
                  <View key={assessment.id} style={[styles.card, shadow.card as object]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[type.h3, { color: colors.ink }]}>
                          {assessment.child_name}
                        </Text>
                        <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                          {assessment.scheduled_date && new Date(assessment.scheduled_date).toLocaleDateString('en-AU')}
                        </Text>
                      </View>
                    </View>
                    <Button
                      label="Mark complete"
                      onPress={() => updateAssessmentMutation.mutate(assessment.id)}
                      disabled={updateAssessmentMutation.isPending}
                      style={{ marginTop: space.lg }}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {completed.length > 0 && (
            <View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Completed
              </Text>
              <View style={{ gap: space.md }}>
                {completed.map(assessment => (
                  <View key={assessment.id} style={[styles.card, shadow.card as object]}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {assessment.child_name}
                    </Text>
                    <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                      ✓ {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {assessments.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
                No assessments assigned yet.
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
  cardHeader: {
    marginBottom: space.md,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
