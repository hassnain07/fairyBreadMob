import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function AdminHomeScreen() {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => dataClient.getAdminStats?.() || Promise.resolve({}),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const statCards = [
    { label: 'Active Families', value: stats?.active_families ?? 0, icon: '👨‍👩‍👧' },
    { label: 'This Month Revenue', value: `$${(stats?.monthly_revenue ?? 0).toFixed(0)}`, icon: '💰' },
    { label: 'Pending Payments', value: stats?.pending_payments ?? 0, icon: '⏳', highlight: stats?.pending_payments > 0 },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Admin Dashboard
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Overview of your tutoring academy.
      </Text>

      <View style={{ gap: space.lg, marginBottom: space.xl }}>
        {isLoading ? (
          <>
            <Skeleton height={100} borderRadius={radius.card} />
            <Skeleton height={100} borderRadius={radius.card} />
          </>
        ) : (
          statCards.map(stat => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                shadow.card as object,
                stat.highlight && { borderColor: colors.pink, borderWidth: 2 },
              ]}
            >
              <View style={styles.statContent}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <View style={{ flex: 1, marginLeft: space.lg }}>
                  <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
                    {stat.label}
                  </Text>
                  <Text style={[type.h2, { color: colors.ink, marginTop: space.sm }]}>
                    {stat.value}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick actions */}
      <View>
        <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
          Quick Access
        </Text>
        <View style={{ gap: space.md }}>
          <Text style={[type.small, { color: colors.muted }]}>
            • View pending payments to approve or reject
            • Manage family bookings
            • Review student assessments
          </Text>
        </View>
      </View>
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
  statCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
  },
});
