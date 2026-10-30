import React, { useMemo, useState } from 'react';
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
import { Check, ChevronDown, ClipboardList, Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Assessment } from '@/types/booking';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMES = ['3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'];

type Tab = 'new-students' | 'term';

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  scheduled:        { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Scheduled'        },
  completed:        { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Completed'        },
  awaiting_payment: { bg: colors.status.pending.bg, fg: colors.status.pending.fg, label: 'Awaiting payment' },
  cancelled:        { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  label: 'Cancelled'        },
};

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Assessment row ────────────────────────────────────────────────────────────

function AssessmentRow({ assessment, onPress }: { assessment: Assessment; onPress: () => void }) {
  const child   = (assessment as any).child;
  const teacher = (assessment as any).teacher;
  const childName = child?.name ?? child?.given_name ?? assessment.child_id.slice(0, 8);
  const ss = STATUS_STYLE[assessment.status] ?? { bg: colors.surface, fg: colors.muted, label: assessment.status };

  return (
    <TouchableOpacity style={[styles.row, shadow.card]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{childName}</Text>
        <Text style={styles.rowMeta}>
          {teacher?.name ?? '—'}
          {assessment.scheduled_date ? `  ·  ${fmtDate(assessment.scheduled_date)}` : ''}
          {assessment.scheduled_time ? `  ·  ${assessment.scheduled_time}` : ''}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
        <Text style={[styles.statusText, { color: ss.fg }]}>{ss.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function DetailSheet({ assessment, onClose, onComplete }: {
  assessment: Assessment; onClose: () => void; onComplete: () => void;
}) {
  const child   = (assessment as any).child;
  const teacher = (assessment as any).teacher;
  const childName = child?.name ?? child?.given_name ?? assessment.child_id;
  const ss = STATUS_STYLE[assessment.status] ?? { bg: colors.surface, fg: colors.muted, label: assessment.status };

  const rows = [
    { label: 'Student',   value: childName },
    { label: 'Teacher',   value: teacher?.name ?? (assessment.teacher_id ?? '—') },
    { label: 'Date',      value: assessment.scheduled_date ? fmtDate(assessment.scheduled_date) : '—' },
    { label: 'Time',      value: assessment.scheduled_time ?? '—' },
    ...(assessment.notes ? [{ label: 'Notes', value: assessment.notes }] : []),
    ...(assessment.payment_id ? [{ label: 'Type', value: 'Booked by parent (new student)' }] : [{ label: 'Type', value: 'Scheduled by admin (term)' }]),
  ];

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconWrap}><ClipboardList size={20} color={colors.pink} /></View>
          <Text style={styles.sheetTitle}>Assessment details</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailTable}>
            {rows.map((r, i) => (
              <View key={i} style={[styles.detailRow, i < rows.length - 1 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue}>{r.value}</Text>
              </View>
            ))}
            {/* Status row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.statusText, { color: ss.fg }]}>{ss.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sheetFooter}>
            <Button label="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            {assessment.status === 'scheduled' && (
              <Button
                label="Mark complete"
                variant="primary"
                icon={Check}
                onPress={() => { onComplete(); onClose(); }}
                style={{ flex: 2 }}
              />
            )}
          </View>
          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Schedule sheet ────────────────────────────────────────────────────────────

function ScheduleSheet({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ programId: '', date: '', time: '3:30 PM' });
  const [addError, setAddError] = useState('');
  const [timeOpen, setTimeOpen] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: qk.programs,
    queryFn:  () => dataClient.getPrograms(),
    staleTime: 5 * 60_000,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: qk.teachers,
    queryFn:  () => dataClient.getTeachers(),
    staleTime: 5 * 60_000,
  });

  const { data: slots = [] } = useQuery({
    queryKey: qk.classSlots,
    queryFn:  () => dataClient.getClassSlots(),
    staleTime: 2 * 60_000,
  });

  const { data: allChildren = [] } = useQuery({
    queryKey: qk.allChildren,
    queryFn:  () => dataClient.getAllChildren(),
    staleTime: 5 * 60_000,
  });

  const activePrograms = programs.filter(p => p.is_active);

  const selectedProgram = programs.find(p => p.id === form.programId);

  const { mutate: schedule, isPending: creating } = useMutation({
    mutationFn: async () => {
      if (!form.programId || !form.date || !form.time) throw new Error('Please fill in all fields.');

      // Find teacher for this program via slots
      const matchingSlot = slots.find(s => s.program_id === form.programId && s.is_active);
      if (!matchingSlot) throw new Error('No active class found for this program. Add a class slot first.');

      const teacher = teachers.find(t => t.id === matchingSlot.teacher_id);

      // Get enrolled children booked into this program's class
      const enrolledChildIds = new Set(
        (await dataClient.getAllBookings())
          .filter(b => b.status === 'confirmed' && b.session?.subject === selectedProgram?.name)
          .map(b => b.child_id)
      );

      if (enrolledChildIds.size === 0) throw new Error('No enrolled students found for this subject.');

      const rows = Array.from(enrolledChildIds).map(childId => ({
        childId,
        classId: matchingSlot.id,
        date:    form.date,
        time:    form.time,
      }));

      const created = await dataClient.createTeacherAssessments(rows);
      return { count: created.length, program: selectedProgram?.name ?? form.programId, teacher: teacher?.name ?? '—' };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: qk.teacherAssessments });
      const msg = result.count === 0
        ? 'No new assessments created — all enrolled students already have an assessment on that date.'
        : `${result.count} assessment${result.count === 1 ? '' : 's'} scheduled for ${result.program} with ${result.teacher}.`;
      onSuccess(msg);
    },
    onError: (e: any) => setAddError(e?.message ?? 'Failed to schedule assessments.'),
  });

  const [progOpen, setProgOpen] = useState(false);

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconWrap}><ClipboardList size={20} color={colors.pink} /></View>
          <Text style={styles.sheetTitle}>Schedule term assessments</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetDesc}>
            Select a subject. Assessments will be created for all enrolled students in that subject's class. The assigned teacher and each family will be notified automatically.
          </Text>

          {/* Subject picker */}
          <Text style={styles.fieldLabel}>Subject</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setProgOpen(v => !v)} activeOpacity={0.8}>
            <Text style={[styles.pickerText, !form.programId && { color: colors.muted }]}>
              {selectedProgram?.name ?? 'Select subject…'}
            </Text>
            <ChevronDown size={15} color={colors.muted} />
          </TouchableOpacity>
          {progOpen && (
            <View style={styles.dropList}>
              {activePrograms.map(p => (
                <TouchableOpacity key={p.id} style={[styles.dropOption, form.programId === p.id && styles.dropOptionActive]} onPress={() => { setForm(f => ({ ...f, programId: p.id })); setProgOpen(false); }} activeOpacity={0.7}>
                  <Text style={[type.small, { color: form.programId === p.id ? colors.pink : colors.ink, fontWeight: form.programId === p.id ? '600' : '400' }]}>{p.name}</Text>
                  {form.programId === p.id && <Check size={13} color={colors.pink} strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Date */}
          <View style={{ marginTop: space.md }}>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={v => setForm(f => ({ ...f, date: v }))}
              placeholder="e.g. 2025-06-15"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Time */}
          <View style={{ marginTop: space.md }}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setTimeOpen(v => !v)} activeOpacity={0.8}>
              <Text style={styles.pickerText}>{form.time}</Text>
              <ChevronDown size={15} color={colors.muted} />
            </TouchableOpacity>
            {timeOpen && (
              <View style={styles.dropList}>
                {TIMES.map(t => (
                  <TouchableOpacity key={t} style={[styles.dropOption, form.time === t && styles.dropOptionActive]} onPress={() => { setForm(f => ({ ...f, time: t })); setTimeOpen(false); }} activeOpacity={0.7}>
                    <Text style={[type.small, { color: form.time === t ? colors.pink : colors.ink }]}>{t}</Text>
                    {form.time === t && <Check size={13} color={colors.pink} strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {addError ? <View style={[styles.errorBox, { marginTop: space.md }]}><Text style={styles.errorText}>{addError}</Text></View> : null}

          <View style={[styles.sheetFooter, { marginTop: space.lg }]}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label={creating ? 'Scheduling…' : 'Schedule'} variant="primary" icon={Check} loading={creating} disabled={!form.programId || !form.date || creating} onPress={() => schedule()} style={{ flex: 2 }} />
          </View>
          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminAssessmentsPage() {
  const qc = useQueryClient();
  const [tab,          setTab]       = useState<Tab>('new-students');
  const [selected,     setSelected]  = useState<Assessment | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [successMsg,   setSuccessMsg]   = useState('');
  const [refreshing,   setRefreshing]   = useState(false);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: qk.teacherAssessments,
    queryFn:  () => dataClient.getTeacherAssessments(),
    staleTime: 30_000,
  });

  // Split: new-student = has payment_id; term = no payment_id
  const newStudentList = useMemo(() => assessments.filter(a => !!(a as any).payment_id || !a.teacher_id), [assessments]);
  const termList       = useMemo(() => assessments.filter(a => !(a as any).payment_id && !!a.teacher_id), [assessments]);

  const { mutate: markComplete } = useMutation({
    mutationFn: (id: string) => dataClient.updateAssessment(id, { status: 'completed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.teacherAssessments }),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teacherAssessments });
    setRefreshing(false);
  };

  const activeList = tab === 'new-students' ? newStudentList : termList;
  const emptyMsg   = tab === 'new-students'
    ? 'No new student assessments yet.'
    : 'No term assessments scheduled yet.';
  const desc = tab === 'new-students'
    ? 'These assessments were booked and paid for by parents of unenrolled students.'
    : 'These assessments are created by admin for enrolled students each term.';

  const handleScheduleSuccess = (msg: string) => {
    setShowSchedule(false);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 7000);
  };

  return (
    <View style={styles.root}>
      {/* Success banner */}
      {successMsg ? (
        <View style={styles.successBanner}>
          <Check size={14} color={colors.status.success.fg} />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}

      {/* Header row — show Schedule button only on term tab */}
      {tab === 'term' && (
        <View style={styles.actionRow}>
          <Button label="Schedule" variant="primary" icon={Plus} onPress={() => { setShowSchedule(true); }} />
        </View>
      )}

      {/* Tab toggle */}
      <View style={styles.tabRowWrap}>
        <View style={styles.tabRow}>
          {(['new-students', 'term'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)} activeOpacity={0.75}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'new-students' ? 'New students' : 'Term assessments'}
              </Text>
              <View style={[styles.tabCount, tab === t && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, tab === t && styles.tabCountTextActive]}>
                  {t === 'new-students' ? newStudentList.length : termList.length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <Text style={styles.tabDesc}>{desc}</Text>

      {/* List */}
      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={72} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={activeList}
          keyExtractor={a => a.id}
          renderItem={({ item }) => <AssessmentRow assessment={item} onPress={() => setSelected(item)} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{emptyMsg}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <DetailSheet
            assessment={selected}
            onClose={() => setSelected(null)}
            onComplete={() => markComplete(selected.id)}
          />
        )}
      </Modal>

      {/* Schedule sheet */}
      <Modal visible={showSchedule} transparent animationType="slide" onRequestClose={() => setShowSchedule(false)}>
        <ScheduleSheet onClose={() => setShowSchedule(false)} onSuccess={handleScheduleSuccess} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.tealSoft, paddingHorizontal: space.lg, paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  successText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.avatar.teal.fg, flex: 1, lineHeight: 18 },

  actionRow: { alignItems: 'flex-end', paddingHorizontal: space.lg, paddingBottom: space.sm },

  // tab
  tabRowWrap: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  tabRow: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: 4, alignSelf: 'flex-start' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.pink },
  tabBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },
  tabBtnTextActive: { fontFamily: 'DMSans-Bold', color: '#fff' },
  tabCount: { backgroundColor: colors.surface, borderRadius: radius.pill, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: colors.muted, lineHeight: 11 },
  tabCountTextActive: { color: '#fff' },
  tabDesc: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, paddingHorizontal: space.lg, paddingBottom: space.sm, lineHeight: 18 },

  // list
  listContent: { paddingHorizontal: space.lg, paddingBottom: space.huge, gap: space.md },
  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },

  // assessment row
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, padding: space.md, borderWidth: 1, borderColor: colors.line },
  rowBody: { flex: 1 },
  rowName: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusText: { fontFamily: 'DMSans-Bold', fontSize: 9 },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  detailValue: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink, textAlign: 'right', flex: 1, marginLeft: space.md },

  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 15, color: colors.ink, minHeight: 46 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, minHeight: 46 },
  pickerText: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.ink },
  dropList: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', marginTop: 4 },
  dropOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  dropOptionActive: { backgroundColor: colors.pinkSoft },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md },
});
