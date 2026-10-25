import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function TeacherHomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-sessions-today'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return dataClient.getUpcomingSessions?.({
        from: today,
        to: tomorrow,
        teacherId: user?.id,
      }) || Promise.resolve([]);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const timeOfDay = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
      bounces={true}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Good {timeOfDay}, {user?.firstName}
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Here's your schedule for today.
      </Text>

      {isLoading ? (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No classes scheduled for today.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
            Today's Classes
          </Text>
          {sessions.map(session => (
            <View key={session.id} style={[styles.sessionCard, shadow.card as object]}>
              <View style={styles.sessionContent}>
                <View style={styles.timeBlock}>
                  <Text style={[type.caption, { color: '#fff', textAlign: 'center' }]}>
                    {new Date(session.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <Text style={[type.h3, { color: colors.ink }]}>
                    {(session as any)?.class?.program?.name || 'Class'}
                  </Text>
                  <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                    {session.booked_count} / {session.capacity} students
                  </Text>
                  <Text style={[type.small, { color: colors.muted }]}>
                    {new Date(session.starts_at).toLocaleDateString('en-AU')}
                  </Text>
                </View>
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
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
