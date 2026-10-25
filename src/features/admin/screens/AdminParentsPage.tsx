import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';

export function AdminParentsPage() {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: families = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-families'],
    queryFn: () => dataClient.getAllFamilies?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Parents
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Manage family accounts.
      </Text>

      {isLoading ? (
        <Skeleton height={100} borderRadius={radius.card} />
      ) : families.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No families yet.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {families.map((family: any) => (
            <View key={family.id} style={[styles.card, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.ink }]}>
                {family.parent_name}
              </Text>
              <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                {family.email}
              </Text>
              {family.phone && (
                <Text style={[type.small, { color: colors.muted }]}>
                  {family.phone}
                </Text>
              )}
              <Text style={[type.caption, { color: colors.muted, marginTop: space.sm }]}>
                {family.children?.length || 0} children
              </Text>
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
