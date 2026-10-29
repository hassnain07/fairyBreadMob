import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConversations } from '../hooks';
import { useBookings } from '../hooks';
import { dataClient } from '@/lib/data/client';
import { inboxTime } from '@/lib/utils/chatTime';
import type { Conversation } from '@/types/message';
import type { ParentMessagesStackProps } from '@/app/navigation/types';

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg },
  { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg },
  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg },
  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg },
  { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg },
  { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
];

function avatarColors(avatarColor: string | undefined, index: number) {
  // Match web's avatar_color string if provided, otherwise cycle the palette
  const mapped: Record<string, (typeof AVATAR_PALETTE)[number]> = {
    pink:    AVATAR_PALETTE[0],
    teal:    AVATAR_PALETTE[1],
    yellow:  AVATAR_PALETTE[2],
    orange:  AVATAR_PALETTE[3],
    green:   AVATAR_PALETTE[4],
    magenta: AVATAR_PALETTE[5],
  };
  return mapped[avatarColor ?? ''] ?? AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── ConversationRow ───────────────────────────────────────────────────────────

type ConvRowProps = {
  conv: Conversation;
  index: number;
  onPress: () => void;
};

function ConversationRow({ conv, index, onPress }: ConvRowProps) {
  const { bg, fg } = avatarColors(conv.avatar_color, index);
  const name = conv.other_party_name ?? 'Unknown';
  const hasUnread = (conv.unread_count ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.convRow, shadow.card]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarText, { color: fg }]}>{initials(name)}</Text>
      </View>

      {/* Body */}
      <View style={styles.convBody}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convName, hasUnread && styles.convNameBold]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            {inboxTime(conv.last_message_at)}
          </Text>
        </View>

        <View style={styles.convBottom}>
          <Text
            style={[
              type.small,
              { color: hasUnread ? colors.ink : colors.muted, flex: 1 },
              hasUnread && { fontWeight: '500' },
            ]}
            numberOfLines={1}
          >
            {conv.last_message_body || 'No messages yet'}
          </Text>

          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Bell size={10} color={colors.pink} style={{ marginRight: 3 }} />
              <Text style={styles.unreadText}>{conv.unread_count} new</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function MessagesPage({ navigation }: ParentMessagesStackProps<'ConversationList'>) {
  const { familyId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversations = [], isLoading } = useConversations();

  // Mirror web: auto-create parent_staff + one per enrolled teacher
  const { data: bookings = [], isSuccess: bookingsLoaded } = useBookings(familyId);

  useEffect(() => {
    if (!familyId || !bookingsLoaded) return;

    dataClient.startConversation('parent_staff', { familyId })
      .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});

    const teacherIds = [...new Set(
      bookings
        .filter((b: any) => b.status === 'confirmed' && b.session?.teacher_id)
        .map((b: any) => b.session!.teacher_id as string),
    )];

    teacherIds.forEach(teacherId => {
      dataClient.startConversation('parent_teacher', { familyId, teacherId })
        .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
        .catch(() => {});
    });
  }, [familyId, bookingsLoaded, bookings, qc]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['conversations'] });
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Page header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[type.eyebrow, { color: colors.pink, marginBottom: 2 }]}>Inbox</Text>
          <Text style={[type.h1, { color: colors.ink }]}>Messages</Text>
        </View>
        {conversations.some(c => (c.unread_count ?? 0) > 0) && (
          <View style={styles.inboxBadge}>
            <Bell size={13} color={colors.pink} />
            <Text style={styles.inboxBadgeText}>
              {conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)} unread
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {isLoading && (
          <View style={{ gap: space.md }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={76} borderRadius={radius.card} />)}
          </View>
        )}

        {/* Empty */}
        {!isLoading && conversations.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <MessageCircle size={32} color={colors.muted} />
            </View>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>No conversations yet</Text>
            <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
              Conversations with your teachers and the Fairybread team will appear here.
            </Text>
          </View>
        )}

        {/* Conversation list */}
        {!isLoading && conversations.length > 0 && (
          <View style={{ gap: space.sm }}>
            {conversations.map((conv: Conversation, i: number) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                index={i}
                onPress={() =>
                  navigation.navigate('ChatDetail', {
                    conversationId: conv.id,
                    otherPartyName: conv.other_party_name ?? 'Chat',
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },

  // header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  inboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pinkSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    gap: 4,
  },
  inboxBadgeText: {
    ...type.caption,
    color: colors.pink,
    fontWeight: '600',
  },

  // scroll
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.sm,
  },

  // conversation row
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  convBody: {
    flex: 1,
    minWidth: 0,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    ...type.small,
    color: colors.ink,
    fontWeight: '500',
    flex: 1,
    marginRight: space.sm,
  },
  convNameBold: {
    fontWeight: '700',
    color: colors.ink,
  },
  convBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pinkSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  unreadText: {
    ...type.caption,
    color: colors.pink,
    fontWeight: '600',
  },

  // empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.huge,
    paddingHorizontal: space.xl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
});
