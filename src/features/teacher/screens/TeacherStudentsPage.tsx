import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function TeacherStudentsPage() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  // Get teacher's upcoming sessions to find students
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      return dataClient.getUpcomingSessions?.({
        from: today,
        to: future,
        teacherId: user?.id,
      }) || Promise.resolve([]);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Deduplicate students across sessions
  const students = React.useMemo(() => {
    const studentMap = new Map<string, any>();
    sessions.forEach(session => {
      // Extract students from session (would need proper data structure from API)
      // For now, show a placeholder
    });
    return Array.from(studentMap.values());
  }, [sessions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        My Students
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Students across all your classes.
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No students enrolled in your classes yet.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {sessions.map(session => (
            <View key={session.id} style={[styles.classCard, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>
                {(session as any)?.class?.program?.name || 'Class'}
              </Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>
                {new Date(session.starts_at).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(session.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={{ gap: space.sm }}>
                <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
                  {session.booked_count} Enrolled
                </Text>
                {/* Student list would go here once API provides student details */}
              </View>
            </View>
          ))}
        </View>
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
  classCard: {
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
