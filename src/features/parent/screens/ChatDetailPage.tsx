import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { colors, type, space, radius } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChatBubble } from '@/components/domain/ChatBubble';
import { useSendMessage } from '../hooks';
import { dataClient } from '@/lib/data/client';
import type { ParentMessagesStackProps } from '@/app/navigation/types';

export function ChatDetailPage({ route, navigation }: ParentMessagesStackProps<'ChatDetail'>) {
  const { conversationId, otherPartyName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sendMessageMutation = useSendMessage();

  // Load messages when screen mounts
  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await dataClient.getMessages?.(conversationId);
        // Sort by created_at ascending (oldest first) for normal chat display
        setMessages((msgs ?? []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        // Mark conversation as read
        await dataClient.markConversationRead?.(conversationId);
      } finally {
        setLoadingMessages(false);
      }
    };

    void loadMessages();

    // Subscribe to realtime messages
    const subscription = dataClient.onMessagesChange?.(conversationId, (newMessage) => {
      setMessages((prev) => {
        // Check if message already exists (optimistic update case)
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        // Add new message and sort
        return [...prev, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [conversationId]);

  const handleSendMessage = useCallback(async () => {
    if (!messageBody.trim()) return;

    const body = messageBody.trim();
    setMessageBody('');

    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      body,
      sender_role: user?.role,
      sender_name: user?.firstName,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        body,
      });

      // Reload messages
      const updated = await dataClient.getMessages?.(conversationId);
      setMessages(updated || []);
    } catch (e) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setMessageBody(body);
    }
  }, [messageBody, conversationId, user?.role, user?.firstName, sendMessageMutation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await dataClient.getMessages?.(conversationId);
      setMessages(updated || []);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.chatContainer}>
      {/* Header - fixed at top */}
      <View style={styles.chatHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[type.h3, { color: colors.pink }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[type.h3, { color: colors.ink }]} numberOfLines={1}>
          {otherPartyName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages with FlatList - scrollable middle section */}
      {loadingMessages ? (
        <View style={styles.messagesContainer}>
          <Skeleton height={60} borderRadius={radius.md} style={{ marginVertical: space.sm }} />
          <Skeleton height={60} borderRadius={radius.md} style={{ marginVertical: space.sm }} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m: any) => m.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isOwn={item.sender_role === user?.role}
            />
          )}
          scrollEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingVertical: space.lg }}
          onContentSizeChange={() => {
            // Scroll to bottom when new messages arrive
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          scrollEventThrottle={16}
          keyboardDismissMode="interactive"
        />
      )}

      {/* Input with KeyboardAvoidingView - fixed at bottom above keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            value={messageBody}
            onChangeText={setMessageBody}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageBody.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageBody.trim() || sendMessageMutation.isPending}
          >
            <Send
              size={18}
              color={messageBody.trim() ? colors.pink : colors.muted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
