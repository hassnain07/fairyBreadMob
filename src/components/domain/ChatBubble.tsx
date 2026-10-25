import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, space, radius } from '@/theme';
import type { ChatMessage } from '@/types/message';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={[type.small, { color: isOwn ? '#fff' : colors.ink }]}>
          {message.body}
        </Text>
      </View>
      <Text style={[type.caption, { color: colors.muted, marginTop: space.xs }]}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.card,
  },
  ownBubble: {
    backgroundColor: colors.pink,
  },
  otherBubble: {
    backgroundColor: colors.surface,
  },
});
