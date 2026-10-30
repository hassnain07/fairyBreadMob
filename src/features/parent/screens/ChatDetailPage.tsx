import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChatBubble, DayDivider, dayKey } from '@/components/domain/ChatBubble';
import { useSendMessage } from '../hooks';
import { dataClient } from '@/lib/data/client';
import { inboxTime } from '@/lib/utils/chatTime';
import type { ChatMessage } from '@/types/message';
import type { ParentMessagesStackProps } from '@/app/navigation/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ChatDetailPage({ route, navigation }: ParentMessagesStackProps<'ChatDetail'>) {
  const { conversationId, otherPartyName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [draft, setDraft]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  const flatListRef  = useRef<FlatList>(null);
  const sendMutation = useSendMessage();

  // ── Load + subscribe ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const msgs = await dataClient.getMessages(conversationId);
        if (!mounted) return;
        setMessages(
          (msgs ?? []).slice().sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
        await dataClient.markConversationRead(conversationId);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    const sub = dataClient.onMessagesChange?.(conversationId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    });

    return () => {
      mounted = false;
      sub?.unsubscribe?.();
    };
  }, [conversationId]);

  // ── Scroll to bottom on new message ────────────────────────────────────────
  const scrollToEnd = useCallback((animated = true) => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated });
    }
  }, [messages.length]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;

    setDraft('');
    setSendError(null);

    // Optimistic message
    const optimistic: ChatMessage = {
      id:            `tmp-${Date.now()}`,
      conversation_id: conversationId,
      sender_role:   user?.role as ChatMessage['sender_role'],
      sender_name:   user?.firstName ?? '',
      body,
      created_at:    new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await sendMutation.mutateAsync({ conversationId, body });
      // Refresh from server to get real ID
      const updated = await dataClient.getMessages(conversationId);
      setMessages(
        (updated ?? []).slice().sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
    } catch (e: any) {
      // Roll back optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setDraft(body);
      setSendError(e?.message ?? 'Failed to send. Tap to retry.');
    }
  }, [draft, conversationId, user, sendMutation]);

  // ── Render list item ────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = item.sender_role === 'parent';
    const showDivider =
      index === 0 ||
      dayKey(item.created_at) !== dayKey(messages[index - 1].created_at);

    return (
      <>
        {showDivider && <DayDivider iso={item.created_at} />}
        <ChatBubble
          message={item}
          isOwn={isOwn}
          showSenderName={!isOwn}
        />
      </>
    );
  }, [messages]);

  const canSend = draft.trim().length > 0 && !sendMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Navigation header ───────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.ink} />
        </TouchableOpacity>

        {/* Avatar + name */}
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials(otherPartyName)}</Text>
          </View>
          <View>
            <Text style={[type.h3, { color: colors.ink }]} numberOfLines={1}>
              {otherPartyName}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Typically replies within a day
            </Text>
          </View>
        </View>

        {/* Spacer to keep centre centred */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Messages ────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <Skeleton height={52} borderRadius={radius.card} style={{ marginBottom: space.md }} />
          <Skeleton height={52} borderRadius={radius.card} width="60%" style={{ marginBottom: space.md, alignSelf: 'flex-end' }} />
          <Skeleton height={52} borderRadius={radius.card} style={{ marginBottom: space.md }} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
            No messages yet. Say hello! 👋
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => scrollToEnd(false)}
          onLayout={() => scrollToEnd(false)}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
        />
      )}

      {/* ── Send error ───────────────────────────────────── */}
      {sendError && (
        <View style={styles.errorBanner}>
          <Text style={[type.small, { color: colors.error.fg, flex: 1 }]}>{sendError}</Text>
        </View>
      )}

      {/* ── Input bar ────────────────────────────────────── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <TextInput
          style={styles.input}
          placeholder="Write a message…"
          placeholderTextColor={colors.muted}
          value={draft}
          onChangeText={t => { setDraft(t); setSendError(null); }}
          onSubmitEditing={handleSend}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, canSend && styles.sendBtnActive]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.75}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={canSend ? '#fff' : colors.muted} />
          ) : (
            <Send size={18} color={canSend ? '#fff' : colors.muted} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: {
    flex: 1,
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.pink,
    letterSpacing: 0.5,
  },

  // list
  listContent: {
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },

  // error
  errorBanner: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: colors.error.bg,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.error.border,
  },

  // input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    gap: space.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : space.sm,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendBtnActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
    ...Platform.select({
      ios:     { shadowColor: colors.pink, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
});
