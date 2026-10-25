import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  TextStyle,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChatBubble } from '@/components/domain/ChatBubble';
import { useConversations, useSendMessage } from '../hooks';
import { dataClient } from '@/lib/data/client';
import type { Conversation } from '@/types/message';
import type { ParentMessagesStackProps } from '@/app/navigation/types';

export function MessagesPage({ navigation }: ParentMessagesStackProps<'ConversationList'>) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Invalidate and refetch conversations
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm } as TextStyle]}>
          Messages
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}>
          A little inbox for all the important things.
        </Text>

        {conversationsLoading && (
          <View style={{ gap: space.lg }}>
            <Skeleton height={80} borderRadius={radius.card} />
            <Skeleton height={80} borderRadius={radius.card} />
          </View>
        )}

        {!conversationsLoading && conversations.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No messages yet.
            </Text>
          </View>
        )}

        {!conversationsLoading &&
          conversations.map((conv: any) => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.conversationCard, shadow.card as object]}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  conversationId: conv.id,
                  otherPartyName: conv.other_party_name,
                })
              }
            >
              <View style={styles.conversationHeader}>
                <Text style={[type.h3, { color: colors.ink }]}>
                  {conv.other_party_name}
                </Text>
                <Text style={[type.caption, { color: colors.mutedSoft }]}>
                  {conv.kind === 'parent_staff' ? 'Fairybread Staff' : 'Teacher'}
                </Text>
              </View>
              <Text
                style={[type.small, { color: colors.muted }]}
                numberOfLines={1}
              >
                {conv.last_message_body || 'No messages yet'}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    gap: space.lg,
  },
  conversationCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  conversationHeader: {
    marginBottom: space.sm,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    backgroundColor: colors.paper,
  },
  messagesContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 15,
    color: colors.ink,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
