/**
 * TeacherMessagesPage
 * Mirrors the parent MessagesPage but scoped to teacher role.
 * Auto-creates a teacher_staff conversation on mount (matching web portal behaviour).
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConversations } from '@/features/parent/hooks';
import { dataClient } from '@/lib/data/client';
import { inboxTime } from '@/lib/utils/chatTime';
import type { Conversation } from '@/types/message';

// ── Avatar helpers ────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
];

function avatarColor(avatarColor: string | undefined, index: number) {
  const map: Record<string, typeof PALETTE[0]> = {
    teal:   PALETTE[0], pink:   PALETTE[1],
    yellow: PALETTE[2], orange: PALETTE[3],
  };
  return map[avatarColor ?? ''] ?? PALETTE[index % PALETTE.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── ConvRow ───────────────────────────────────────────────────────────────────

function ConvRow({ conv, index, onPress }: { conv: Conversation; index: number; onPress: () => void }) {
  const { bg, fg } = avatarColor(conv.avatar_color, index);
  const name = conv.other_party_name ?? 'Unknown';
  const unread = (conv.unread_count ?? 0) > 0;

  return (
    <TouchableOpacity style={[styles.convRow, shadow.card]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarText, { color: fg }]}>{initials(name)}</Text>
      </View>
      <View style={styles.convBody}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convName, unread && styles.convNameBold]} numberOfLines={1}>{name}</Text>
          <Text style={[type.caption, { color: colors.muted }]}>{inboxTime(conv.last_message_at)}</Text>
        </View>
        <View style={styles.convBottom}>
          <Text style={[type.small, { color: unread ? colors.ink : colors.muted, flex: 1, fontWeight: unread ? '500' : '400' }]} numberOfLines={1}>
            {conv.last_message_body || 'No messages yet'}
          </Text>
          {unread && (
            <View style={styles.unreadBadge}>
              <Bell size={10} color={colors.teal} style={{ marginRight: 3 }} />
              <Text style={styles.unreadText}>{conv.unread_count} new</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

import type { TeacherMessagesStackProps } from '@/app/navigation/types';

export function TeacherMessagesPage({ navigation }: TeacherMessagesStackProps<'TeacherConversationList'>) {
  const { teacherId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: conversations = [], isLoading } = useConversations();

  // Auto-create teacher_staff conversation (mirrors web)
  useEffect(() => {
    if (!teacherId) return;
    dataClient.startConversation('teacher_staff', { teacherId })
      .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});
  }, [teacherId, qc]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['conversations'] });
    setRefreshing(false);
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[type.eyebrow, { color: colors.teal, marginBottom: 2 }]}>Inbox</Text>
          <Text style={[type.h1, { color: colors.ink }]}>Messages</Text>
        </View>
        {totalUnread > 0 && (
          <View style={styles.inboxBadge}>
            <Bell size={13} color={colors.teal} />
            <Text style={styles.inboxBadgeText}>{totalUnread} unread</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ gap: space.md }}>
            {[1, 2].map(i => <Skeleton key={i} height={76} borderRadius={radius.card} />)}
          </View>
        )}

        {!isLoading && conversations.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={32} color={colors.muted} />
            </View>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>No conversations yet</Text>
            <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
              Messages with parents and admin will appear here.
            </Text>
          </View>
        )}

        {!isLoading && conversations.length > 0 && (
          <View style={{ gap: space.sm }}>
            {conversations.map((conv: Conversation, i: number) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                index={i}
                onPress={() =>
                  navigation.navigate('TeacherChat', {
                    conversationId:  conv.id,
                    otherPartyName:  conv.other_party_name ?? 'Chat',
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
  root: { flex: 1, backgroundColor: colors.paper },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  inboxBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, gap: 4,
  },
  inboxBadgeText: { ...type.caption, color: colors.teal, fontWeight: '600' } as any,

  content: { flexGrow: 1, paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },

  convRow: {
    flexDirection:  'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line, gap: space.md,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  convBody: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { ...type.small, color: colors.ink, fontWeight: '500', flex: 1, marginRight: space.sm } as any,
  convNameBold: { fontWeight: '700' },
  convBottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unreadBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.tealSoft, borderRadius: radius.pill,
    paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  unreadText: { ...type.caption, color: colors.teal, fontWeight: '600' } as any,

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.huge, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
});
