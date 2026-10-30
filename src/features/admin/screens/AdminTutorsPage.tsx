import React, { useMemo, useState } from 'react';
import {
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
import { Check, Plus, UserRound, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Teacher } from '@/types/teacher';

// ── Constants ────────────────────────────────────────────────────────────────

const COLOURS = ['pink', 'teal', 'yellow', 'orange', 'green', 'magenta'] as const;
type Colour = typeof COLOURS[number];

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  pink:    { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  teal:    { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  yellow:  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  orange:  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
  green:   { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg   },
  magenta: { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
};

function teacherColors(color: string, index: number) {
  return COLOR_MAP[color] ?? COLOR_MAP[COLOURS[index % COLOURS.length]];
}

// ── Tutor card ────────────────────────────────────────────────────────────────

function TutorCard({ teacher, index, studentCount, slots }: {
  teacher: Teacher;
  index: number;
  studentCount: number;
  slots: any[];
}) {
  const { bg, fg } = teacherColors(teacher.color, index);

  return (
    <View style={[styles.tutorCard, shadow.card]}>
      {/* Header */}
      <View style={styles.tutorCardHead}>
        <View style={[styles.tutorAvatar, { backgroundColor: bg }]}>
          <Text style={[styles.tutorAvatarText, { color: fg }]}>{teacher.initials}</Text>
        </View>
        <View style={styles.tutorInfo}>
          <Text style={styles.tutorName}>{teacher.name}</Text>
          <Text style={styles.tutorStudents}>{studentCount} active student{studentCount !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Subjects */}
      {teacher.subjects.length > 0 && (
        <View style={styles.subjectRow}>
          {teacher.subjects.map(s => (
            <View key={s} style={[styles.subjectTag, { backgroundColor: bg }]}>
              <Text style={[styles.subjectTagText, { color: fg }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Classes */}
      <View style={styles.classesSectionHead}>
        <Text style={styles.classesSectionLabel}>Classes assigned</Text>
      </View>
      {slots.length === 0 ? (
        <Text style={styles.noClassesText}>No classes assigned yet.</Text>
      ) : (
        <View style={{ gap: space.xs }}>
          {slots.map(slot => (
            <View key={slot.id} style={styles.classRow}>
              <View style={[styles.classDot, { backgroundColor: fg }]} />
              <View style={styles.classBody}>
                <Text style={styles.classSubject}>{slot.subject}</Text>
                <Text style={styles.classMeta}>
                  {DAYS[slot.day_of_week] ?? '—'} · {slot.start_time}
                </Text>
              </View>
              <View style={styles.classCapacity}>
                <Text style={styles.classCapacityText}>{slot.next_booked_count}/{slot.capacity}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Invite sheet ──────────────────────────────────────────────────────────────

function InviteSheet({ onClose }: { onClose: (msg?: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: '', fullName: '', role: 'teacher' as 'teacher' | 'admin',
    subjects: [] as string[], color: 'pink' as Colour,
  });
  const [formError, setFormError] = useState('');

  const { data: programs = [] } = useQuery({
    queryKey: qk.programs,
    queryFn:  () => dataClient.getPrograms(),
    staleTime: 5 * 60_000,
  });

  const { mutate: invite, isPending } = useMutation({
    mutationFn: () => dataClient.inviteStaff({
      email:    form.email.trim().toLowerCase(),
      fullName: form.fullName.trim(),
      role:     form.role,
      subjects: form.subjects,
      color:    form.color,
    }),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: qk.teachers });
      const msg = result?.invited === false
        ? `${form.email} already has an account — they've been added as a teacher.`
        : `Invite sent to ${form.email}. They will receive an email to set their password.`;
      onClose(msg);
    },
    onError: (e: any) => setFormError(e?.message ?? 'Failed to send invite.'),
  });

  function handleSubmit() {
    if (!form.email.trim() || !form.email.includes('@')) { setFormError('A valid email is required.'); return; }
    if (!form.fullName.trim()) { setFormError('Full name is required.'); return; }
    setFormError('');
    invite();
  }

  function toggleSubject(s: string) {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s],
    }));
  }

  return (
    <Pressable style={styles.backdrop} onPress={() => onClose()}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconWrap}><UserRound size={20} color={colors.pink} /></View>
          <Text style={styles.sheetTitle}>Invite tutor</Text>
          <TouchableOpacity onPress={() => onClose()} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sheetDesc}>They will receive an email with a link to set their password.</Text>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.md }}>
            {/* Full name */}
            <View>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput style={styles.input} value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} placeholder="e.g. Rebecca Martin" placeholderTextColor={colors.muted} />
            </View>

            {/* Email */}
            <View>
              <Text style={styles.fieldLabel}>Email address</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="e.g. rebecca@email.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
            </View>

            {/* Role */}
            <View>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.roleRow}>
                {(['teacher', 'admin'] as const).map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                    onPress={() => setForm(f => ({ ...f, role: r }))}
                    activeOpacity={0.75}
                  >
                    {form.role === r && <Check size={13} color={colors.pink} strokeWidth={3} />}
                    <Text style={[styles.roleBtnText, form.role === r && { color: colors.pink, fontWeight: '700' }]}>
                      {r === 'teacher' ? 'Teacher' : 'Admin (also a teacher)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Colour */}
            <View>
              <Text style={styles.fieldLabel}>Avatar colour</Text>
              <View style={styles.colourRow}>
                {COLOURS.map(c => {
                  const { bg } = COLOR_MAP[c];
                  const isActive = form.color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colourDot, { backgroundColor: bg }, isActive && styles.colourDotActive]}
                      onPress={() => setForm(f => ({ ...f, color: c }))}
                      activeOpacity={0.8}
                    >
                      {isActive && <Check size={14} color={COLOR_MAP[c].fg} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Subjects */}
            <View>
              <Text style={styles.fieldLabel}>Subjects</Text>
              {programs.length === 0 ? (
                <Text style={styles.noClassesText}>No programs yet — add programs first.</Text>
              ) : (
                <View style={styles.subjectPicker}>
                  {programs.map(p => {
                    const selected = form.subjects.includes(p.name);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.subjectPickerTag, selected && styles.subjectPickerTagActive]}
                        onPress={() => toggleSubject(p.name)}
                        activeOpacity={0.75}
                      >
                        {selected && <Check size={11} color={colors.pink} strokeWidth={3} />}
                        <Text style={[styles.subjectPickerText, selected && { color: colors.pink, fontWeight: '700' }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {formError ? <View style={styles.errorBox}><Text style={styles.errorText}>{formError}</Text></View> : null}

            <View style={styles.sheetFooter}>
              <Button label="Cancel" variant="ghost" onPress={() => onClose()} style={{ flex: 1 }} />
              <Button
                label={isPending ? 'Sending invite…' : 'Send invite'}
                variant="primary"
                icon={Check}
                loading={isPending}
                disabled={isPending}
                onPress={handleSubmit}
                style={{ flex: 2 }}
              />
            </View>
            <View style={{ height: space.xl }} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminTutorsPage() {
  const qc = useQueryClient();
  const [showInvite,     setShowInvite]    = useState(false);
  const [successMsg,     setSuccessMsg]    = useState('');
  const [refreshing,     setRefreshing]    = useState(false);

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: qk.teachers,
    queryFn:  () => dataClient.getTeachers(),
    staleTime: 2 * 60_000,
  });

  const { data: classSlots = [] } = useQuery({
    queryKey: qk.classSlots,
    queryFn:  () => dataClient.getClassSlots(),
    staleTime: 2 * 60_000,
  });

  const studentsByTeacher = useMemo(
    () => classSlots.reduce<Record<string, number>>((acc, slot) => {
      acc[slot.teacher_id] = (acc[slot.teacher_id] ?? 0) + slot.next_booked_count;
      return acc;
    }, {}),
    [classSlots]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teachers });
    await qc.invalidateQueries({ queryKey: qk.classSlots });
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Action row */}
        <View style={styles.actionRow}>
          <Button label="Invite tutor" variant="primary" icon={Plus} onPress={() => { setShowInvite(true); setSuccessMsg(''); }} />
        </View>

        {/* Success banner */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Check size={15} color={colors.status.success.fg} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Loading */}
        {teachersLoading && (
          <View style={{ gap: space.md }}>
            {[1, 2].map(i => <Skeleton key={i} height={160} borderRadius={radius.card} />)}
          </View>
        )}

        {/* Empty */}
        {!teachersLoading && teachers.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}><UserRound size={28} color={colors.muted} /></View>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>No tutors yet</Text>
            <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
              Invite your first tutor to get started.
            </Text>
            <Button label="Invite tutor" variant="primary" icon={Plus} onPress={() => setShowInvite(true)} />
          </View>
        )}

        {/* Tutor cards */}
        {!teachersLoading && teachers.map((teacher, i) => (
          <TutorCard
            key={teacher.id}
            teacher={teacher}
            index={i}
            studentCount={studentsByTeacher[teacher.id] ?? 0}
            slots={classSlots.filter(s => s.teacher_id === teacher.id)}
          />
        ))}
      </ScrollView>

      {/* Invite sheet */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <InviteSheet onClose={(msg) => { setShowInvite(false); if (msg) setSuccessMsg(msg); }} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  actionRow: { alignItems: 'flex-end' },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.status.success.bg, borderRadius: radius.md, padding: space.md,
  },
  successText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.status.success.fg, flex: 1 },

  // tutor card
  tutorCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line, gap: space.md },
  tutorCardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tutorAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tutorAvatarText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  tutorInfo: { flex: 1 },
  tutorName: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.ink },
  tutorStudents: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },

  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  subjectTag: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  subjectTagText: { fontFamily: 'DMSans-Bold', fontSize: 11 },

  classesSectionHead: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md },
  classesSectionLabel: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.mutedSoft, letterSpacing: 0.8, textTransform: 'uppercase' },
  noClassesText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },

  classRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  classDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  classBody: { flex: 1 },
  classSubject: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  classMeta: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },
  classCapacity: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  classCapacityText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.muted },

  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 15, color: colors.ink, minHeight: 46 },

  roleRow: { gap: space.sm },
  roleBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, borderWidth: 1.5, borderColor: colors.line },
  roleBtnActive: { borderColor: colors.pink, backgroundColor: colors.pinkSoft },
  roleBtnText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink },

  colourRow: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  colourDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colourDotActive: { borderWidth: 2.5, borderColor: colors.ink },

  subjectPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  subjectPickerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: space.md, paddingVertical: space.xs,
    backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line,
  },
  subjectPickerTagActive: { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
  subjectPickerText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md, marginTop: space.md },
});
