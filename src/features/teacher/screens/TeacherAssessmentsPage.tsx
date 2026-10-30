import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2 } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Assessment } from '@/types/booking';
import type { ClassSession } from '@/types/teacher';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Assessment group card ─────────────────────────────────────────────────────

function GroupCard({
  title, subtitle, date, time, count, allComplete, onMarkAll, isMarking,
}: {
  title:       string;
  subtitle?:   string;
  date?:       string;
  time?:       string;
  count:       number;
  allComplete: boolean;
  onMarkAll:   () => void;
  isMarking:   boolean;
}) {
  return (
    <View style={[styles.card, shadow.card, allComplete && styles.cardDone]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <View style={[styles.subjectChip, allComplete && styles.subjectChipDone]}>
            <Text style={[styles.subjectChipText, allComplete && { color: colors.status.success.fg }]}>{title}</Text>
          </View>
          {subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
        </View>
        <View style={[styles.statusBadge, allComplete ? styles.statusBadgeDone : styles.statusBadgePending]}>
          {allComplete && <Check size={10} color={colors.status.success.fg} strokeWidth={3} />}
          <Text style={[styles.statusBadgeText, allComplete ? { color: colors.status.success.fg } : { color: colors.status.pending.fg }]}>
            {allComplete ? 'Complete' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.detailRows}>
        {date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assessment date</Text>
            <Text style={styles.detailValue}>{fmtDate(date)}{time ? ` at ${time}` : ''}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Students</Text>
          <Text style={styles.detailValue}>{count}</Text>
        </View>
      </View>

      {!allComplete && (
        <Button
          label={isMarking ? 'Marking…' : 'Mark all complete'}
          variant="soft"
          icon={CheckCircle2}
          loading={isMarking}
          onPress={onMarkAll}
          fullWidth
        />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function TeacherAssessmentsPage() {
  const { teacherId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const twoWeeksAgo  = useMemo(() => new Date(Date.now() - 14 * 86_400_000).toISOString(), []);
  const fourWeeksAhead = useMemo(() => new Date(Date.now() + 28 * 86_400_000).toISOString(), []);

  const { data: sessions = [] } = useQuery({
    queryKey: qk.sessions({ teacherId, from: twoWeeksAgo, to: fourWeeksAhead }),
    queryFn:  () => dataClient.getUpcomingSessions({ teacherId: teacherId ?? undefined, from: twoWeeksAgo, to: fourWeeksAhead }),
    enabled:  !!teacherId,
    staleTime: 2 * 60_000,
  });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: qk.teacherAssessments,
    queryFn:  () => dataClient.getTeacherAssessments(),
    enabled:  !!teacherId,
    staleTime: 60_000,
  });

  const myAssessments = assessments.filter(a => !a.teacher_id || a.teacher_id === teacherId);

  const { mutate: markComplete, isPending: isMarking, variables: markingId } = useMutation({
    mutationFn: (id: string) => dataClient.updateAssessment(id, { status: 'completed' }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: qk.teacherAssessments }),
  });

  function markAll(rows: Assessment[]) {
    rows.filter(a => a.status !== 'completed').forEach(a => markComplete(a.id));
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teacherAssessments });
    await qc.invalidateQueries({ queryKey: qk.sessions({ teacherId, from: twoWeeksAgo, to: fourWeeksAhead }) });
    setRefreshing(false);
  };

  // Group by session
  const bySession = sessions
    .map(session => {
      const rows = myAssessments.filter(a => a.class_id === session.id);
      if (!rows.length) return null;
      const first  = rows[0];
      const allComplete = rows.every(a => a.status === 'completed');
      return { session, rows, date: first.scheduled_date, time: first.scheduled_time, allComplete };
    })
    .filter(Boolean) as { session: ClassSession; rows: Assessment[]; date?: string; time?: string; allComplete: boolean }[];

  const unlinked = myAssessments.filter(a => !a.class_id);

  const isEmpty = bySession.length === 0 && unlinked.length === 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Assessments</Text>
      <Text style={styles.pageSub}>Assessments scheduled for your students this term.</Text>

      {isLoading ? (
        <View style={{ gap: space.md }}>
          <Skeleton height={140} borderRadius={radius.card} />
          <Skeleton height={140} borderRadius={radius.card} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No assessments scheduled for you yet.</Text>
        </View>
      ) : (
        <>
          {bySession.map(({ session, rows, date, time, allComplete }) => (
            <GroupCard
              key={session.id}
              title={session.subject}
              subtitle={new Date(session.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
              date={date}
              time={time}
              count={rows.length}
              allComplete={allComplete}
              onMarkAll={() => markAll(rows)}
              isMarking={isMarking}
            />
          ))}

          {unlinked.map(a => {
            const isDone = a.status === 'completed';
            return (
              <GroupCard
                key={a.id}
                title={`Assessment · ${a.child_id.slice(0, 6)}`}
                date={a.scheduled_date}
                time={a.scheduled_time}
                count={1}
                allComplete={isDone}
                onMarkAll={() => markComplete(a.id)}
                isMarking={isMarking && markingId === a.id}
              />
            );
          })}
        </>
      )}

      <View style={{ height: space.xl }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub:   { fontFamily: 'DMSans-Regular',  fontSize: 14, color: colors.muted, marginTop: 4 },

  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
    gap:             space.md,
  },
  cardDone: { borderColor: '#C9EBCE', backgroundColor: '#F6FDF8' },

  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeadLeft: { flex: 1, gap: 4 },
  cardSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },

  subjectChip: {
    alignSelf:       'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical:   3,
    borderRadius:    radius.pill,
    backgroundColor: colors.pinkSoft,
  },
  subjectChipDone: { backgroundColor: colors.status.success.bg },
  subjectChipText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.avatar.pink.fg },

  statusBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: space.sm,
    paddingVertical:   3,
    borderRadius:      radius.pill,
    flexShrink:        0,
  },
  statusBadgeDone:    { backgroundColor: colors.status.success.bg },
  statusBadgePending: { backgroundColor: colors.status.pending.bg },
  statusBadgeText:    { fontFamily: 'DMSans-Bold', fontSize: 10 },

  detailRows: { gap: space.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },
  detailValue: { fontFamily: 'DMSans-Bold',    fontSize: 12, color: colors.ink },

  emptyWrap: { alignItems: 'center', paddingVertical: space.xl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },
});
