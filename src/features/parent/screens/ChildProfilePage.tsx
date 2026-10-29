import React, { useMemo, useState } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Download, Plus, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ParentMoreStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<ParentMoreStackParamList, 'ChildProfile'>;

type Tab = 'overview' | 'goals' | 'attendance' | 'sessions' | 'notes';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',   label: 'Overview'   },
  { key: 'goals',      label: 'Goals'      },
  { key: 'attendance', label: 'Attendance' },
  { key: 'sessions',   label: 'Sessions'   },
  { key: 'notes',      label: 'Notes'      },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string; bar: number }> = {
  present: { bg: colors.status.success.bg, fg: colors.status.success.fg, bar: 1.0 },
  late:    { bg: colors.status.pending.bg, fg: colors.status.pending.fg, bar: 0.7 },
  absent:  { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  bar: 0.3 },
  no_show: { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  bar: 0.3 },
};

export function ChildProfilePage({ route, navigation }: Props) {
  const { childId } = route.params;
  const { familyId } = useAuth();
  const queryClient  = useQueryClient();

  const [tab,          setTab]          = useState<Tab>('overview');
  const [refreshing,   setRefreshing]   = useState(false);
  const [showAddGoal,  setShowAddGoal]  = useState(false);
  const [goalForm,     setGoalForm]     = useState('');
  const [goalError,    setGoalError]    = useState('');

  /* ── Queries ── */
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: qk.children(familyId ?? ''),
    queryFn:  () => dataClient.getChildren(familyId!),
    enabled:  !!familyId,
  });
  const child = children.find(c => c.id === childId) ?? children[0];

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: qk.childAttendance(child?.id ?? ''),
    queryFn:  () => dataClient.getChildAttendance(child!.id),
    enabled:  !!child?.id,
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: qk.reports(child?.id ?? ''),
    queryFn:  () => dataClient.getReportsForChild(child!.id),
    enabled:  !!child?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: qk.bookings(familyId ?? ''),
    queryFn:  () => dataClient.getBookings(familyId!),
    enabled:  !!familyId,
  });

  /* ── Derived ── */
  const latestReport    = useMemo(() => reports.length > 0 ? reports[reports.length - 1] : null, [reports]);
  const presentCount    = useMemo(() => attendance.filter(a => a.status === 'present' || a.status === 'late').length, [attendance]);
  const attendancePct   = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;
  const childBookings   = useMemo(
    () => bookings.filter(b => b.child_id === child?.id && b.status === 'confirmed' && b.session),
    [bookings, child]
  );
  const upcomingSessions = useMemo(
    () => childBookings
      .filter(b => b.session && new Date(b.session.starts_at) > new Date())
      .sort((a, b) => new Date(a.session!.starts_at).getTime() - new Date(b.session!.starts_at).getTime()),
    [childBookings]
  );

  /* ── Goals mutation ── */
  const goalMutation = useMutation({
    mutationFn: (goals: string) => dataClient.updateChild(child!.id, { goals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.children(familyId ?? '') });
      setShowAddGoal(false);
      setGoalForm('');
      setGoalError('');
    },
    onError: (e: any) => setGoalError(e?.message ?? 'Failed to save goal.'),
  });

  const handleAddGoal = () => {
    if (!goalForm.trim()) { setGoalError('Please enter a goal.'); return; }
    const current = child?.goals ?? '';
    const updated  = current ? `${current}\n${goalForm.trim()}` : goalForm.trim();
    goalMutation.mutate(updated);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: qk.children(familyId ?? '') });
      if (child?.id) {
        await queryClient.invalidateQueries({ queryKey: qk.childAttendance(child.id) });
        await queryClient.invalidateQueries({ queryKey: qk.reports(child.id) });
        await queryClient.invalidateQueries({ queryKey: qk.bookings(familyId ?? '') });
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* ── Loading ── */
  if (loadingChildren) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Skeleton height={130} borderRadius={16} style={{ marginBottom: 12 }} />
        <Skeleton height={40}  borderRadius={8}  style={{ marginBottom: 12 }} />
        <Skeleton height={200} borderRadius={16} />
      </ScrollView>
    );
  }

  if (!child) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 48 }}>Child not found.</Text>
      </ScrollView>
    );
  }

  const firstName = child.givenName || child.name.split(' ')[0];

  /* ── Tab content ── */
  const renderOverview = () => (
    <View style={s.tabContent}>
      {/* Progress snapshot card */}
      <View style={[s.card, shadow.card as object]}>
        <Text style={s.cardEyebrow}>Progress snapshot</Text>
        <Text style={s.cardTitle}>Latest report</Text>

        {latestReport ? (
          <>
            <Text style={s.termLabel}>{latestReport.term}</Text>
            {latestReport.subjects.map(sub => (
              <View key={sub.subject} style={s.subjectRow}>
                <View style={s.subjectLabelRow}>
                  <View style={s.subjectDot} />
                  <Text style={s.subjectName}>{sub.subject}</Text>
                  <Text style={s.subjectPct}>{sub.rating * 20}%</Text>
                </View>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${sub.rating * 20}%` }]} />
                </View>
              </View>
            ))}
            {latestReport.subjects.length === 0 && (
              <Text style={s.mutedText}>Overall: {latestReport.overall ?? '—'}/5</Text>
            )}
          </>
        ) : (
          <Text style={s.mutedText}>No reports yet.</Text>
        )}
      </View>

      {/* Attendance card */}
      <View style={[s.card, shadow.card as object]}>
        <Text style={s.cardEyebrow}>Attendance</Text>
        {attendancePct !== null ? (
          <View style={s.attRow}>
            <View style={s.attNumber}>
              <Text style={s.attPct}>{attendancePct}%</Text>
              <Text style={s.attSub}>this term</Text>
            </View>
            {/* Mini bar chart – last 6 sessions */}
            <View style={s.barChart}>
              {attendance.slice(-6).map((a, i) => {
                const col = STATUS_COLORS[a.status] ?? STATUS_COLORS.absent;
                return (
                  <View key={i} style={s.barChartCol}>
                    <View style={[s.barChartBar, { height: `${col.bar * 100}%`, backgroundColor: col.fg }]} />
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={s.mutedText}>No attendance recorded yet.</Text>
        )}
      </View>

      {/* Latest tutor note */}
      {latestReport?.note ? (
        <View style={[s.noticeCard, shadow.card as object]}>
          <Text style={s.noticeStar}>✦</Text>
          <Text style={s.cardEyebrow}>Latest tutor note</Text>
          <Text style={s.noticeQuote}>"{latestReport.note}"</Text>
        </View>
      ) : null}
    </View>
  );

  const renderGoals = () => (
    <View style={[s.card, shadow.card as object]}>
      <Text style={s.cardEyebrow}>Learning goals</Text>
      <Text style={s.cardTitle}>What we're working towards</Text>

      {child.goals ? (
        <View style={s.goalsList}>
          {child.goals.split('\n').filter(Boolean).map((g, i) => (
            <View key={i} style={s.goalRow}>
              <View style={s.goalCheck}><Check size={12} color={colors.status.success.fg} /></View>
              <Text style={s.goalText}>{g}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[s.mutedText, { marginBottom: 16 }]}>No goals set yet.</Text>
      )}

      {goalError ? <Text style={s.errorText}>{goalError}</Text> : null}

      <Button
        label="Add a goal"
        icon={Plus}
        variant="secondary"
        onPress={() => { setShowAddGoal(true); setGoalForm(''); setGoalError(''); }}
        style={{ marginTop: 8 }}
      />
    </View>
  );

  const renderAttendance = () => (
    <View style={[s.card, shadow.card as object]}>
      <Text style={s.cardEyebrow}>Attendance history</Text>
      <Text style={s.cardTitle}>Session by session</Text>

      {attendance.length === 0 ? (
        <Text style={s.mutedText}>No attendance recorded yet.</Text>
      ) : (
        <View style={s.attList}>
          {attendance.map((a, i) => {
            const col = STATUS_COLORS[a.status] ?? STATUS_COLORS.absent;
            return (
              <View key={i} style={[s.attListRow, i < attendance.length - 1 && s.attListRowBorder]}>
                <Text style={s.attSession}>Session {i + 1}</Text>
                <View style={[s.statusBadge, { backgroundColor: col.bg }]}>
                  <Text style={[s.statusText, { color: col.fg }]}>
                    {a.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderSessions = () => (
    <View style={[s.card, shadow.card as object]}>
      <Text style={s.cardEyebrow}>Upcoming sessions</Text>
      <Text style={s.cardTitle}>Booked classes</Text>

      {upcomingSessions.length === 0 ? (
        <Text style={s.mutedText}>No upcoming sessions booked.</Text>
      ) : (
        <View style={s.attList}>
          {upcomingSessions.map((b, i) => (
            <View key={b.id} style={[s.attListRow, i < upcomingSessions.length - 1 && s.attListRowBorder]}>
              <Text style={s.sessionSubject}>{b.session!.subject}</Text>
              <Text style={s.sessionDate}>
                {new Date(b.session!.starts_at).toLocaleDateString('en-AU', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderNotes = () => (
    <View style={[s.card, shadow.card as object]}>
      <Text style={s.cardEyebrow}>About this student</Text>
      {child.notes ? (
        <Text style={s.notesBody}>{child.notes}</Text>
      ) : (
        <Text style={s.mutedText}>
          No notes have been recorded yet. Tutor notes will appear here after each session.
        </Text>
      )}
    </View>
  );

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
      >
        {/* ── Profile Banner ── */}
        <View style={[s.banner, { backgroundColor: '#FFF1F5' }, shadow.card as object]}>
          <View style={s.bannerRow}>
            <View style={s.bannerAvatar}>
              <Text style={s.bannerInitials}>{child.initials}</Text>
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerEyebrow}>Student profile</Text>
              <Text style={s.bannerName}>{child.name}</Text>
              <Text style={s.bannerMeta}>{child.year}{child.school ? ` · ${child.school}` : ''}</Text>
            </View>
          </View>

          <View style={s.bannerActions}>
            <TouchableOpacity style={s.bannerBtn}>
              <Download size={16} color={colors.ink} />
              <Text style={s.bannerBtnText}>Download summary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.bannerBtn, { borderColor: colors.pink }]}
              onPress={() => navigation.navigate('Reports' as any)}
            >
              <ArrowRight size={16} color={colors.pink} />
              <Text style={[s.bannerBtnText, { color: colors.pink }]}>View full report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabBar}
          contentContainerStyle={s.tabBarContent}
        >
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            >
              <Text style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Tab Content ── */}
        {tab === 'overview'   && renderOverview()}
        {tab === 'goals'      && renderGoals()}
        {tab === 'attendance' && renderAttendance()}
        {tab === 'sessions'   && renderSessions()}
        {tab === 'notes'      && renderNotes()}
      </ScrollView>

      {/* ── Add Goal Modal ── */}
      <Modal visible={showAddGoal} transparent animationType="slide" onRequestClose={() => setShowAddGoal(false)}>
        <View style={s.modalBackdrop}>
          <Pressable style={s.modalOverlay} onPress={() => setShowAddGoal(false)} />
          <View style={s.modalSheet}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAddGoal(false)}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            <View style={s.modalIcon}>
              <Plus size={22} color={colors.pink} />
            </View>
            <Text style={s.modalTitle}>Add a goal</Text>
            <Text style={s.modalSubtitle}>
              Set a new learning goal for {firstName}.
            </Text>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Goal</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Build confidence with fractions"
                placeholderTextColor={colors.mutedSoft}
                value={goalForm}
                onChangeText={setGoalForm}
                multiline
                editable={!goalMutation.isPending}
              />
            </View>

            {goalError ? <Text style={s.errorText}>{goalError}</Text> : null}

            <Button
              label={goalMutation.isPending ? 'Saving…' : 'Save goal'}
              icon={Check}
              onPress={handleAddGoal}
              loading={goalMutation.isPending}
              fullWidth
              style={{ marginTop: 4 }}
            />
            <TouchableOpacity style={s.cancelLink} onPress={() => setShowAddGoal(false)}>
              <Text style={s.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 40 },

  /* Banner */
  banner:       { borderRadius: 16, padding: 18 },
  bannerRow:    { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  bannerAvatar: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.avatar.pink.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bannerInitials: { fontSize: 20, fontWeight: '700', color: colors.avatar.pink.fg },
  bannerText: { flex: 1 },
  bannerEyebrow: { fontSize: 10, fontWeight: '600', color: colors.pink, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  bannerName:    { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  bannerMeta:    { fontSize: 12, color: colors.muted },
  bannerActions: { flexDirection: 'row', gap: 10 },
  bannerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, backgroundColor: colors.card,
    borderRadius: 10, borderWidth: 1, borderColor: colors.line,
  },
  bannerBtnText: { fontSize: 12, fontWeight: '600', color: colors.ink },

  /* Tabs */
  tabBar:        { borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 4 },
  tabBarContent: { paddingHorizontal: 0, gap: 4 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive:     { borderBottomColor: colors.pink },
  tabBtnText:       { fontSize: 13, color: colors.muted, fontWeight: '500' },
  tabBtnTextActive: { color: colors.pink, fontWeight: '700' },

  tabContent: { gap: 14 },

  /* Generic card */
  card: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: colors.line,
  },
  cardEyebrow: { fontSize: 10, fontWeight: '600', color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  mutedText:   { fontSize: 13, color: colors.muted, lineHeight: 18 },
  termLabel:   { fontSize: 12, color: colors.muted, marginBottom: 10 },

  /* Subject progress bars */
  subjectRow:     { marginBottom: 12 },
  subjectLabelRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  subjectDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink, marginRight: 8 },
  subjectName:    { flex: 1, fontSize: 13, color: colors.ink, fontWeight: '500' },
  subjectPct:     { fontSize: 13, fontWeight: '700', color: colors.pink },
  barTrack:       { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: '100%', backgroundColor: colors.pink, borderRadius: 3 },

  /* Attendance widget */
  attRow:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
  attNumber:{ alignItems: 'center' },
  attPct:   { fontSize: 28, fontWeight: '800', color: colors.ink },
  attSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },
  barChart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 48, gap: 4 },
  barChartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barChartBar: { width: '100%', borderRadius: 3, minHeight: 4 },

  /* Notice card */
  noticeCard: {
    backgroundColor: colors.pinkSoft, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: '#F9D4E4', gap: 4,
  },
  noticeStar:  { fontSize: 20, color: colors.pink },
  noticeQuote: { fontSize: 14, color: colors.ink, fontStyle: 'italic', lineHeight: 20 },

  /* Goals */
  goalsList: { gap: 10, marginBottom: 14 },
  goalRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  goalCheck: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.status.success.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  goalText:  { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },
  errorText: { fontSize: 12, color: colors.error.fg, marginBottom: 8 },

  /* Attendance list */
  attList:          { gap: 0 },
  attListRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  attListRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  attSession:       { fontSize: 13, color: colors.muted },
  statusBadge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:       { fontSize: 11, fontWeight: '700' },

  /* Sessions list */
  sessionSubject: { fontSize: 14, fontWeight: '700', color: colors.ink, flex: 1 },
  sessionDate:    { fontSize: 12, color: colors.muted },
  notesBody:      { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 6 },

  /* Modal */
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay:  { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
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
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle:    { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 18 },
  field:         { marginBottom: 14 },
  fieldLabel:    { fontSize: 11, fontWeight: '600', color: colors.mutedSoft, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: colors.ink, backgroundColor: colors.surface2,
  },
  cancelLink:     { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { fontSize: 14, color: colors.muted },
});
