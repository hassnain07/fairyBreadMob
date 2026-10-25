import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function AdminBookingsPage() {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => dataClient.getAllBookings?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Group by status
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const waitlist = bookings.filter(b => b.status === 'waiting_list');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  const renderBooking = (booking: any) => (
    <View key={booking.id} style={[styles.card, shadow.card as object]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.h3, { color: colors.ink }]}>
            {booking.child_name}
          </Text>
          <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
            {booking.program_name}
          </Text>
          <Text style={[type.small, { color: colors.muted }]}>
            {new Date(booking.session_date).toLocaleDateString('en-AU')} · {booking.session_time}
          </Text>
          <Text style={[type.small, { color: colors.muted }]}>
            {booking.family_name}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: booking.status === 'confirmed' ? '#EDF9EF' : '#FFF8DF' }]}>
          <Text style={[type.pill, { color: booking.status === 'confirmed' ? '#3C9E68' : '#AD8917' }]}>
            {booking.status === 'confirmed' ? '✓ Confirmed' : booking.status === 'waiting_list' ? '⏳ Waiting' : '✕ Cancelled'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        All Bookings
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        View and manage class bookings.
      </Text>

      {isLoading ? (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No bookings yet.
          </Text>
        </View>
      ) : (
        <>
          {confirmed.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Confirmed ({confirmed.length})
              </Text>
              <View style={{ gap: space.md }}>
                {confirmed.map(renderBooking)}
              </View>
            </View>
          )}

          {waitlist.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Waiting List ({waitlist.length})
              </Text>
              <View style={{ gap: space.md }}>
                {waitlist.map(renderBooking)}
              </View>
            </View>
          )}

          {cancelled.length > 0 && (
            <View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Cancelled ({cancelled.length})
              </Text>
              <View style={{ gap: space.md }}>
                {cancelled.map(renderBooking)}
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
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
