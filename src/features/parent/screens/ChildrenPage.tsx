import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, MoreHorizontal, Plus, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pill } from '@/components/ui/Pill';
import { useChildren } from '../hooks/useChildren';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ParentMoreStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<ParentMoreStackParamList, 'MyChildren'>;

const YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];

const AVATAR_COLORS = [
  { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
  { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg   },
  { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
];
const avatarColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

export function ChildrenPage({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: children = [], isLoading } = useChildren(familyId ?? undefined);

  const [refreshing, setRefreshing]     = useState(false);
  const [showAdd,    setShowAdd]        = useState(false);
  const [showYear,   setShowYear]       = useState(false);
  const [addError,   setAddError]       = useState('');

  const [form, setForm] = useState({
    givenName: '',
    familyName: '',
    year: 'Year 1',
    school: '',
  });

  const addChild = useMutation({
    mutationFn: () =>
      dataClient.addChild(familyId!, {
        givenName:  form.givenName.trim(),
        familyName: form.familyName.trim(),
        year:       form.year,
        school:     form.school.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.children(familyId ?? '') });
      setForm({ givenName: '', familyName: '', year: 'Year 1', school: '' });
      setAddError('');
      setShowAdd(false);
    },
    onError: (e: any) => setAddError(e?.message ?? 'Failed to add child.'),
  });

  const handleAdd = () => {
    if (!form.givenName.trim())  { setAddError('Please enter a given name.');  return; }
    if (!form.familyName.trim()) { setAddError('Please enter a family name.'); return; }
    setAddError('');
    addChild.mutate();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await queryClient.invalidateQueries({ queryKey: qk.children(familyId ?? '') }); }
    finally { setRefreshing(false); }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Skeleton height={28} borderRadius={6} style={{ width: '55%', marginBottom: 6 }} />
        <Skeleton height={16} borderRadius={4} style={{ width: '70%', marginBottom: 24 }} />
        <Skeleton height={110} borderRadius={14} style={{ marginBottom: 12 }} />
        <Skeleton height={110} borderRadius={14} />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.pageTitle}>Meet the learners</Text>
            <Text style={s.pageSubtitle}>Every child has their own kind of brilliant.</Text>
          </View>
          <TouchableOpacity
            style={s.addCircleBtn}
            onPress={() => { setShowAdd(true); setAddError(''); }}
            activeOpacity={0.75}
          >
            <Plus size={22} color={colors.pink} />
          </TouchableOpacity>
        </View>

        {/* ── Empty state ── */}
        {children.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No children added yet.</Text>
            <Button
              label="Add your first child"
              icon={Plus}
              onPress={() => { setShowAdd(true); setAddError(''); }}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* ── Child cards ── */}
        {children.map((child, idx) => {
          const col = avatarColor(idx);
          return (
            <TouchableOpacity
              key={child.id}
              style={[s.childCard, shadow.card as object]}
              onPress={() => navigation.navigate('ChildProfile', { childId: child.id })}
              activeOpacity={0.85}
            >
              {/* Card head */}
              <View style={s.cardHead}>
                <View style={[s.avatar, { backgroundColor: col.bg }]}>
                  <Text style={[s.avatarInitials, { color: col.fg }]}>{child.initials}</Text>
                </View>

                <View style={s.cardHeadText}>
                  <Text style={s.childName}>{child.name}</Text>
                  <Text style={s.childMeta}>
                    {child.year}{child.school ? ` · ${child.school}` : ''}
                  </Text>
                </View>

                <View style={[s.enrolledBadge,
                  child.enrolled
                    ? { backgroundColor: colors.status.success.bg }
                    : { backgroundColor: colors.status.pending.bg }
                ]}>
                  <Text style={[s.enrolledText,
                    { color: child.enrolled ? colors.status.success.fg : colors.status.pending.fg }
                  ]}>
                    {child.enrolled ? 'Enrolled' : 'Needs enrolment'}
                  </Text>
                </View>
              </View>

              {/* Subject tags */}
              {child.subjects && child.subjects.length > 0 && (
                <View style={s.tagRow}>
                  {child.subjects.map(sub => (
                    <View key={sub} style={s.tag}>
                      <Text style={s.tagText}>{sub}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* View profile link */}
              <View style={s.viewProfileRow}>
                <Text style={s.viewProfileLink}>View profile</Text>
                <ArrowRight size={14} color={colors.pink} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Add Child Modal ── */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={s.modalBackdrop}>
          <Pressable style={s.modalOverlay} onPress={() => setShowAdd(false)} />

          <View style={s.modalSheet}>
            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAdd(false)}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            {/* Icon + title */}
            <View style={s.modalIcon}>
              <Plus size={22} color={colors.pink} />
            </View>
            <Text style={s.modalTitle}>Add a child</Text>
            <Text style={s.modalSubtitle}>
              Tell us a little about your child to add them to your family dashboard.
            </Text>

            {/* Form */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Given name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Charlie"
                placeholderTextColor={colors.mutedSoft}
                value={form.givenName}
                onChangeText={v => setForm(f => ({ ...f, givenName: v }))}
                editable={!addChild.isPending}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Family name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Smith"
                placeholderTextColor={colors.mutedSoft}
                value={form.familyName}
                onChangeText={v => setForm(f => ({ ...f, familyName: v }))}
                editable={!addChild.isPending}
              />
            </View>

            {/* Year level picker */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Year level</Text>
              <TouchableOpacity
                style={s.input}
                onPress={() => setShowYear(true)}
              >
                <Text style={{ fontSize: 15, color: colors.ink }}>{form.year}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>School (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Example Primary School"
                placeholderTextColor={colors.mutedSoft}
                value={form.school}
                onChangeText={v => setForm(f => ({ ...f, school: v }))}
                editable={!addChild.isPending}
              />
            </View>

            {addError ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{addError}</Text>
              </View>
            ) : null}

            <Button
              label={addChild.isPending ? 'Adding…' : 'Add child'}
              icon={Check}
              onPress={handleAdd}
              loading={addChild.isPending}
              fullWidth
              style={{ marginTop: 8 }}
            />
            <TouchableOpacity style={s.cancelLink} onPress={() => setShowAdd(false)}>
              <Text style={s.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Year picker modal ── */}
      <Modal visible={showYear} transparent animationType="fade">
        <Pressable style={s.pickerBackdrop} onPress={() => setShowYear(false)}>
          <View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Select year level</Text>
            {YEAR_OPTIONS.map(y => (
              <TouchableOpacity
                key={y}
                style={[s.pickerOption, form.year === y && s.pickerOptionActive]}
                onPress={() => { setForm(f => ({ ...f, year: y })); setShowYear(false); }}
              >
                <Text style={[s.pickerOptionText, form.year === y && { color: colors.pink, fontWeight: '700' }]}>
                  {y}
                </Text>
                {form.year === y && <Check size={16} color={colors.pink} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  headerText: { flex: 1, paddingRight: 12 },
  pageTitle:    { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  addCircleBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Empty */
  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  emptyText: { fontSize: 13, color: colors.muted },

  /* Child card */
  childCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.line,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: { fontSize: 17, fontWeight: '700' },
  cardHeadText: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  childMeta: { fontSize: 12, color: colors.muted },
  enrolledBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  enrolledText: { fontSize: 10, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.line,
  },
  tagText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  viewProfileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12,
  },
  viewProfileLink: { fontSize: 13, fontWeight: '600', color: colors.pink },

  /* Add modal */
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay:  { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    maxHeight: '92%',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  modalIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle:    { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 18 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.mutedSoft, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: colors.ink, backgroundColor: colors.surface2,
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: colors.error.bg, borderRadius: 10, borderWidth: 1,
    borderColor: colors.error.border, padding: 12, marginBottom: 12,
  },
  errorText: { fontSize: 13, color: colors.error.fg },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { fontSize: 14, color: colors.muted },

  /* Year picker */
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  pickerSheet: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
  pickerTitle: { fontSize: 13, fontWeight: '700', color: colors.mutedSoft, padding: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  pickerOptionActive: { backgroundColor: colors.pinkSoft },
  pickerOptionText: { fontSize: 15, color: colors.ink },
});
