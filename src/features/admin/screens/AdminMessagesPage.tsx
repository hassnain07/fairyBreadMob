import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import type { AdminMessagesStackProps } from '@/app/navigation/types';

export function AdminMessagesPage({ navigation }: AdminMessagesStackProps<'MessageList'>) {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => dataClient.getConversations?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderConversation = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.conversationItem, shadow.card as object]}
      onPress={() =>
        navigation.navigate('ChatDetail', {
          conversationId: item.id,
          otherPartyName: item.title,
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={[type.h3, { color: '#fff' }]}>
          {item.title?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text style={[type.h3, { color: colors.ink }]}>
          {item.title}
        </Text>
        <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]} numberOfLines={1}>
          {item.last_message || 'No messages'}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.badge}>
          <Text style={[type.pill, { color: '#fff' }]}>
            {item.unread_count > 9 ? '9+' : item.unread_count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.contentPadding}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.lg }}>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
              Messages
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Communicate with families and staff.
            </Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyBox}>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
                No conversations yet.
              </Text>
            </View>
          )
        }
      />
    </View>
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
  conversationItem: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    minWidth: 24,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
});
