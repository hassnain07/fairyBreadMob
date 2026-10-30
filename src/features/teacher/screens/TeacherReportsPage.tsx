import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle, FileText, RotateCcw } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassBooking, SubjectRating } from '@/types/booking';
import type { Child } from '@/types/family';

// ── Star picker ───────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={6} activeOpacity={0.75}>
          <Text style={[styles.star, n <= value && styles.starOn]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Textarea field ────────────────────────────────────────────────────────────

function ReportField({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: colors.pink }}> *</Text>}</Text>
      <TextInput
        style={styles.textarea}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type FormState = { childId: string; overall: number; subjects: SubjectRating[]; strengths: string; areas: string; note: string };
const BLANK_FORM: Omit<FormState, 'childId'> = { overall: 3, subjects: [], strengths: '', areas: '', note: '' };

export function TeacherReportsPage() {
  const { teacherId } = useAuth();
  const qc = useQueryClient();

  const [form,       setForm]       = useState<FormState>({ childId: '', ...BLANK_FORM });
  const [done,       setDone]       = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Settings for current term label
  const { data: settings = {} } = useQuery({
    queryKey: qk.settings,
    queryFn:  () => dataClient.getSettings(),
    staleTime: 10 * 60_000,
  });
  const currentTerm = (settings as any)?.business?.current_term_label ?? 'Current Term';

  // Bookings → unique students
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: qk.teacherBookings,
    queryFn:  () => dataClient.getBookingsForTeacher(),
    enabled:  !!teacherId,
    staleTime: 2 * 60_000,
  });

  const { data: existingReports = [] } = useQuery({
    queryKey: qk.teacherReports,
    queryFn:  () => dataClient.getTeacherReports(),
    enabled:  !!teacherId,
    staleTime: 60_000,
  });

  const confirmed = bookings.filter((b: ClassBooking) => b.status === 'confirmed' && b.child);
  const myStudents: (Pick<Child, 'id' | 'name' | 'initials'> & Partial<Child>)[] = useMemo(() => {
    const seen = new Set<string>();
    return confirmed
      .filter(b => { if (seen.has(b.child_id)) return false; seen.add(b.child_id); return true; })
      .map(b => b.child!);
  }, [confirmed]);

  const reportedIds = new Set(
    existingReports.filter(r => r.teacher_id === teacherId && r.term === currentTerm).map(r => r.child_id)
  );

  function selectChild(childId: string) {
    const booking = confirmed.find(b => b.child_id === childId);
    const subject = booking?.session?.subject ?? '';
    const subjects: SubjectRating[] = subject ? [{ subject, rating: 3 }] : [];
    setForm({ childId, ...BLANK_FORM, subjects });
    setDone(false); setSaveError('');
  }

  function setSubjectRating(subject: string, rating: number) {
    setForm(f => ({
      ...f,
      subjects: f.subjects.map(s => s.subject === subject ? { ...s, rating: rating as SubjectRating['rating'] } : s),
    }));
  }

  const selectedChild = myStudents.find(c => c.id === form.childId);
  const childBooking  = confirmed.find(b => b.child_id === form.childId);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => dataClient.createReport({
      child_id:  form.childId,
      teacher_id: teacherId!,
      term:      currentTerm,
      overall:   form.overall   as SubjectRating['rating'],
      subjects:  form.subjects,
      strengths: form.strengths,
      areas:     form.areas,
      note:      form.note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teacherReports });
      qc.invalidateQueries({ queryKey: qk.reports(form.childId) });
      setDone(true);
    },
    onError: (e: any) => setSaveError(e?.message ?? 'Failed to submit report.'),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teacherBookings });
    await qc.invalidateQueries({ queryKey: qk.teacherReports });
    setRefreshing(false);
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.root, styles.doneWrap]}>
        <View style={styles.doneIcon}>
          <CheckCircle size={36} color={colors.status.success.fg} />
        </View>
        <Text style={styles.doneTitle}>Report submitted</Text>
        <Text style={styles.doneSub}>
          The report for {selectedChild?.name} has been saved for {currentTerm}.
        </Text>
        <Button
          label="Write another report"
          variant="soft"
          icon={RotateCcw}
          onPress={() => { setForm({ childId: '', ...BLANK_FORM }); setDone(false); }}
        />
      </View>
    );
  }

  // ── Student selection ─────────────────────────────────────────────────────
  if (!form.childId) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Student reports</Text>
        <Text style={styles.pageSub}>Write end-of-term reports for your enrolled students.</Text>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Select student</Text>
          <Text style={styles.sectionLabelSub}>{currentTerm}</Text>
        </View>

        {bookingsLoading ? (
          <View style={{ gap: space.md }}>
            <Skeleton height={64} borderRadius={radius.card} />
            <Skeleton height={64} borderRadius={radius.card} />
          </View>
        ) : myStudents.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No enrolled students found.</Text>
          </View>
        ) : (
          <View style={[styles.listCard, shadow.card]}>
            {myStudents.map((child, i) => {
              const done_ = reportedIds.has(child.id);
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.studentRow, i < myStudents.length - 1 && styles.studentRowBorder, done_ && styles.studentRowDone]}
                  onPress={() => !done_ && selectChild(child.id)}
                  activeOpacity={done_ ? 1 : 0.7}
                >
                  <View style={[styles.avatar, done_ && { backgroundColor: colors.status.success.bg }]}>
                    <Text style={[styles.avatarText, done_ && { color: colors.status.success.fg }]}>
                      {child.initials ?? child.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.studentName, done_ && { color: colors.muted }]}>{child.name}</Text>
                  {done_ && (
                    <View style={styles.doneBadge}>
                      <Check size={11} color={colors.status.success.fg} strokeWidth={3} />
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: space.xl }} />
      </ScrollView>
    );
  }

  // ── Report form ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setForm({ childId: '', ...BLANK_FORM })} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>← Back to students</Text>
        </TouchableOpacity>

        <View style={[styles.formCard, shadow.card]}>
          <View style={styles.formCardHead}>
            <View>
              <Text style={styles.formCardEyebrow}>Writing report for</Text>
              <Text style={styles.formCardTitle}>
                {selectedChild?.name} · {childBooking?.session?.subject ?? '—'} · {currentTerm}
              </Text>
            </View>
            <FileText size={18} color={colors.muted} />
          </View>

          {saveError !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Overall */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Overall progress</Text>
            <StarPicker value={form.overall} onChange={v => setForm(f => ({ ...f, overall: v }))} />
          </View>

          {/* Subject ratings */}
          {form.subjects.map(s => (
            <View key={s.subject} style={styles.field}>
              <Text style={styles.fieldLabel}>{s.subject} rating</Text>
              <StarPicker value={s.rating} onChange={v => setSubjectRating(s.subject, v)} />
            </View>
          ))}

          <ReportField
            label="Strengths"
            value={form.strengths}
            onChange={v => setForm(f => ({ ...f, strengths: v }))}
            placeholder="What has this student done well this term?"
            required
          />
          <ReportField
            label="Areas to continue"
            value={form.areas}
            onChange={v => setForm(f => ({ ...f, areas: v }))}
            placeholder="What should the student keep working on?"
          />
          <ReportField
            label="Tutor note to parent"
            value={form.note}
            onChange={v => setForm(f => ({ ...f, note: v }))}
            placeholder="A personal note for the parent…"
            required
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Cancel" variant="ghost" onPress={() => setForm({ childId: '', ...BLANK_FORM })} style={{ flex: 1 }} />
        <Button
          label={isPending ? 'Saving…' : 'Submit report'}
          variant="primary"
          icon={Check}
          loading={isPending}
          disabled={isPending || !form.strengths.trim() || !form.note.trim()}
          onPress={() => submit()}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub:   { fontFamily: 'DMSans-Regular',  fontSize: 14, color: colors.muted, marginTop: 4 },

  sectionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionLabelText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLabelSub:  { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.mutedSoft },

  // list
  listCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.line,
  },
  studentRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: space.md,
    paddingVertical:   space.md,
    gap:               space.md,
  },
  studentRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  studentRowDone: { opacity: 0.6 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.avatar.pink.fg },
  studentName: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink, flex: 1 },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.status.success.bg, borderRadius: radius.pill,
    paddingHorizontal: space.sm, paddingVertical: 3,
  },
  doneBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.status.success.fg },

  // form
  backBtn:     { alignSelf: 'flex-start' },
  backBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.teal },

  formCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
    gap:             space.lg,
  },
  formCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formCardEyebrow: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.pink, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  formCardTitle:   { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },

  field:      { gap: space.sm },
  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.ink },

  stars: { flexDirection: 'row', gap: space.sm },
  star:    { fontSize: 28, color: colors.line },
  starOn:  { color: colors.yellow },

  textarea: {
    backgroundColor:   colors.surface,
    borderRadius:      radius.md,
    padding:           space.md,
    minHeight:         88,
    borderWidth:       1,
    borderColor:       colors.line,
    fontSize:          14,
    color:             colors.ink,
    lineHeight:        20,
  },

  errorBox: {
    backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md,
    borderWidth: 1, borderColor: colors.error.border,
  },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },

  emptyWrap: { alignItems: 'center', paddingVertical: space.xl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },

  doneWrap: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  doneIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.status.success.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontFamily: 'DMSans-Bold',    fontSize: 22, color: colors.ink, textAlign: 'center' },
  doneSub:   { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, textAlign: 'center' },

  footer: {
    flexDirection: 'row', gap: space.md, padding: space.lg,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card,
  },
});
