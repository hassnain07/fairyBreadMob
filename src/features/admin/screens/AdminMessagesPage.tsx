import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Mail, MessageCircle, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import { inboxTime } from '@/lib/utils/chatTime';
import type { Conversation } from '@/types/message';
import type { AdminMessagesStackProps } from '@/app/navigation/types';

// ── Colour palette ────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
  { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg   },
  { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
];

const MAPPED: Record<string, typeof PALETTE[0]> = {
  pink:    PALETTE[0], teal:    PALETTE[1], yellow:  PALETTE[2],
  orange:  PALETTE[3], green:   PALETTE[4], magenta: PALETTE[5],
};

function avatarColor(avatarColor: string | undefined, idx: number) {
  return MAPPED[avatarColor ?? ''] ?? PALETTE[idx % PALETTE.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConvRow({ conv, index, onPress }: { conv: Conversation; index: number; onPress: () => void }) {
  const { bg, fg } = avatarColor(conv.avatar_color, index);
  const name = conv.other_party_name ?? 'Unknown';
  const unread = (conv.unread_count ?? 0) > 0;

  return (
    <TouchableOpacity style={[styles.convRow, shadow.card]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.convAvatar, { backgroundColor: bg }]}>
        <Text style={[styles.convAvatarText, { color: fg }]}>{initials(name)}</Text>
      </View>
      <View style={styles.convBody}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convName, unread && styles.convNameBold]} numberOfLines={1}>{name}</Text>
          <Text style={[type.caption, { color: colors.muted }]}>{inboxTime(conv.last_message_at)}</Text>
        </View>
        <View style={styles.convBottom}>
          <Text
            style={[type.small, { color: unread ? colors.ink : colors.muted, flex: 1, fontWeight: unread ? '500' : '400' }]}
            numberOfLines={1}
          >
            {conv.last_message_body || 'No messages yet'}
          </Text>
          {unread && (
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

// ── Compose sheet ─────────────────────────────────────────────────────────────

function ComposeSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [composeFamilyId,   setComposeFamilyId]  = useState('');
  const [composeTeacherId,  setComposeTeacherId] = useState('');
  const [composeMsg,        setComposeMsg]       = useState('');
  const [composeError,      setComposeError]     = useState('');
  const [familySearch,      setFamilySearch]     = useState('');
  const [teacherSearch,     setTeacherSearch]    = useState('');

  const { data: families = [] } = useQuery({
    queryKey: qk.families,
    queryFn:  () => dataClient.getAllFamilies(),
    staleTime: 60_000,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: qk.teachers,
    queryFn:  () => dataClient.getTeachers(),
    staleTime: 60_000,
  });

  const { mutate: compose, isPending } = useMutation({
    mutationFn: async () => {
      const kind   = composeTeacherId ? 'teacher_staff' : 'parent_staff';
      const target = composeTeacherId
        ? { teacherId: composeTeacherId }
        : { familyId: composeFamilyId };
      const cid = await dataClient.startConversation(kind as any, target);
      await dataClient.sendMessage(cid, composeMsg.trim());
      return cid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
    onError: (e: any) => setComposeError(e?.message ?? 'Failed to send message.'),
  });

  const canSend = (!(!composeFamilyId && !composeTeacherId)) && composeMsg.trim().length > 0;

  const filteredFamilies  = families.filter(f => !familySearch  || f.parent_name.toLowerCase().includes(familySearch.toLowerCase()));
  const filteredTeachers = teachers.filter(t => !teacherSearch || t.name.toLowerCase().includes(teacherSearch.toLowerCase()));

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconWrap}><Mail size={20} color={colors.pink} /></View>
          <Text style={styles.sheetTitle}>New message</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Family picker */}
          <Text style={styles.fieldLabel}>Family</Text>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} placeholder="Search family…" value={familySearch} onChangeText={setFamilySearch} placeholderTextColor={colors.muted} />
          </View>
          <View style={styles.pickerList}>
            {filteredFamilies.slice(0, 6).map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.pickerRow, composeFamilyId === f.id && styles.pickerRowActive]}
                onPress={() => { setComposeFamilyId(f.id); setComposeTeacherId(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, composeFamilyId === f.id && { color: colors.pink, fontWeight: '600' }]}>{f.parent_name}</Text>
                {composeFamilyId === f.id && <Check size={14} color={colors.pink} strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Teacher picker */}
          <Text style={[styles.fieldLabel, { marginTop: space.md }]}>Or teacher</Text>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} placeholder="Search teacher…" value={teacherSearch} onChangeText={setTeacherSearch} placeholderTextColor={colors.muted} />
          </View>
          <View style={styles.pickerList}>
            {filteredTeachers.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.pickerRow, composeTeacherId === t.id && styles.pickerRowActive]}
                onPress={() => { setComposeTeacherId(t.id); setComposeFamilyId(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, composeTeacherId === t.id && { color: colors.pink, fontWeight: '600' }]}>{t.name}</Text>
                {composeTeacherId === t.id && <Check size={14} color={colors.pink} strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={[styles.fieldLabel, { marginTop: space.md }]}>Message</Text>
          <TextInput
            style={styles.textarea}
            value={composeMsg}
            onChangeText={setComposeMsg}
            placeholder="Type your message here…"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {composeError ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>{composeError}</Text></View>
          ) : null}

          <View style={styles.sheetFooter}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label={isPending ? 'Sending…' : 'Send'} variant="primary" icon={Check} loading={isPending} disabled={!canSend || isPending} onPress={() => compose()} style={{ flex: 2 }} />
          </View>

          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminMessagesPage({ navigation }: AdminMessagesStackProps<'MessageList'>) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing,    setRefreshing]   = useState(false);
  const [showCompose,   setShowCompose]  = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn:  () => dataClient.getConversations(),
    staleTime: 30_000,
  });

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
          <Text style={[type.eyebrow, { color: colors.pink, marginBottom: 2 }]}>All conversations</Text>
          <Text style={[type.h1, { color: colors.ink }]}>
            {totalUnread > 0 ? `${totalUnread} unread` : 'Inbox'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowCompose(true)}
          activeOpacity={0.75}
        >
          <Plus size={18} color={colors.pink} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={76} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          renderItem={({ item, index }) => (
            <ConvRow
              conv={item}
              index={index}
              onPress={() => navigation.navigate('ChatDetail', {
                conversationId: item.id,
                otherPartyName: item.other_party_name ?? 'Chat',
              })}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, space.xl) }]}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <MessageCircle size={32} color={colors.muted} />
              </View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>No conversations yet</Text>
              <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
                Tap "New" to start a conversation with a family or teacher.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCompose} transparent animationType="slide" onRequestClose={() => setShowCompose(false)}>
        <ComposeSheet onClose={() => setShowCompose(false)} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper,
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    backgroundColor: colors.pinkSoft, borderRadius: radius.pill,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderWidth: 1, borderColor: colors.avatar.pink.bg,
  },
  newBtnText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.pink },

  listContent: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md, flexGrow: 1 },

  // conv row
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line, gap: space.md,
  },
  convAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  convAvatarText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  convBody: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink, flex: 1, marginRight: space.sm },
  convNameBold: { fontFamily: 'DMSans-Bold' },
  convBottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unreadBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pinkSoft,
    borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  unreadText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.pink },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.huge, paddingHorizontal: space.xl },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },

  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  searchRow: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, minHeight: 40, justifyContent: 'center', marginBottom: 6 },
  searchInput: { fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  pickerList: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  pickerRowActive: { backgroundColor: colors.pinkSoft },
  pickerText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink, flex: 1 },

  textarea: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, minHeight: 88, borderWidth: 1, borderColor: colors.line, fontSize: 14, color: colors.ink, lineHeight: 20, marginBottom: space.md },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border, marginBottom: space.md },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md },
});
