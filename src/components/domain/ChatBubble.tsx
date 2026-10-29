import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, type, space, radius } from '@/theme';
import { bubbleTime, dayDivider, dayKey } from '@/lib/utils/chatTime';
import type { ChatMessage } from '@/types/message';

// ── Day divider ───────────────────────────────────────────────────────────────

export function DayDivider({ iso }: { iso: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{dayDivider(iso)}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export { dayKey };

// ── Chat bubble ───────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName?: boolean;
}

export function ChatBubble({ message, isOwn, showSenderName = true }: ChatBubbleProps) {
  const time = bubbleTime(message.created_at);

  return (
    <View style={[styles.wrap, isOwn ? styles.wrapOwn : styles.wrapOther]}>
      {/* Reminder pill (system messages / reminders) */}
      {message.is_reminder && (
        <View style={[styles.reminderPill, isOwn ? styles.reminderOwn : styles.reminderOther]}>
          <Bell size={11} color={colors.status.pending.fg} />
          <Text style={[type.caption, { color: colors.status.pending.fg, marginLeft: 3 }]}>
            Reminder
          </Text>
        </View>
      )}

      {/* Sender name (only for received messages) */}
      {!isOwn && showSenderName && (
        <Text style={styles.senderName}>{message.sender_name}</Text>
      )}

      {/* Bubble */}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[type.small, { color: isOwn ? '#fff' : colors.ink, lineHeight: 20 }]}>
          {message.body}
        </Text>
        {/* Time inside bubble, trailing */}
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // wrapper
  wrap: {
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  wrapOwn: {
    alignItems: 'flex-end',
  },
  wrapOther: {
    alignItems: 'flex-start',
  },

  // reminder pill
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.pending.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  reminderOwn:   { alignSelf: 'flex-end' },
  reminderOther: { alignSelf: 'flex-start' },

  // sender name
  senderName: {
    ...type.caption,
    color: colors.muted,
    marginBottom: 3,
    marginLeft: 4,
    fontWeight: '600',
  },

  // bubble
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: 6,
    borderRadius: radius.card,
  },
  bubbleOwn: {
    backgroundColor: colors.pink,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },

  // time trailing inside bubble
  time: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  timeOwn:   { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  timeOther: { color: colors.muted, textAlign: 'right' },

  // day divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginVertical: space.md,
    gap: space.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerLabel: {
    ...type.caption,
    color: colors.muted,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
});
