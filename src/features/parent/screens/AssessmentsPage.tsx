import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  UserRound,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Assessment } from '@/types/booking';
import type { ParentMoreStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<ParentMoreStackParamList, 'MyAssessments'>;

/* ── helpers ─────────────────────────────────────────────────── */
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toTimeLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const STATUS_LABEL: Record<Assessment['status'], string> = {
  awaiting_payment: 'Awaiting payment',
  scheduled:        'Scheduled',
  completed:        'Completed',
  cancelled:        'Cancelled',
};

const STATUS_STYLE: Record<Assessment['status'], { bg: string; fg: string }> = {
  awaiting_payment: { bg: colors.status.pending.bg,  fg: colors.status.pending.fg  },
  scheduled:        { bg: colors.status.success.bg,  fg: colors.status.success.fg  },
  completed:        { bg: colors.status.success.bg,  fg: colors.status.success.fg  },
  cancelled:        { bg: colors.status.danger.bg,   fg: colors.status.danger.fg   },
};

/* ── Assessment card ─────────────────────────────────────────── */
function AssessmentCard({ a }: { a: Assessment & { child?: { name: string } } }) {
  const isInitial    = !a.payment_id;
  const accentColor  = isInitial ? colors.pink : colors.teal;
  const statusStyle  = STATUS_STYLE[a.status];
  const childName    = (a as any).child?.name ?? '';
  const teacherName  = (a as any).teacher?.name ?? '';

  return (
    <View style={[s.assessCard, shadow.card as object]}>
      {/* Left colour stripe */}
      <View style={[s.stripe, { backgroundColor: accentColor }]} />

      {/* Date block */}
      <View style={[s.dateBlock, { backgroundColor: accentColor + '18' }]}>
        {a.scheduled_date ? (
          (() => {
            const d = new Date(a.scheduled_date + 'T00:00:00');
            return (
              <>
                <Text style={[s.dateDay,   { color: accentColor }]}>{DAYS[d.getDay()]}</Text>
                <Text style={[s.dateNum,   { color: accentColor }]}>{d.getDate()}</Text>
                <Text style={[s.dateMon,   { color: accentColor }]}>{MONTHS[d.getMonth()]}</Text>
              </>
            );
          })()
        ) : (
          <>
            <Text style={[s.dateDay, { color: colors.mutedSoft, fontSize: 9 }]}>TBC</Text>
            <Text style={[s.dateNum, { color: colors.mutedSoft }]}>—</Text>
          </>
        )}
      </View>

      {/* Main content */}
      <View style={s.assessMain}>
        <Text style={[s.assessEyebrow, { color: accentColor }]}>
          {isInitial ? 'Initial assessment' : 'Term assessment'}
        </Text>
        <Text style={s.assessTitle}>
          {isInitial ? 'Initial Learning Assessment' : 'Progress check-in'}
        </Text>

        {a.scheduled_time ? (
          <View style={s.metaRow}>
            <Clock3 size={12} color={colors.muted} />
            <Text style={s.metaText}>{toTimeLabel(a.scheduled_time)}</Text>
          </View>
        ) : null}

        {teacherName ? (
          <View style={s.metaRow}>
            <UserRound size={12} color={colors.muted} />
            <Text style={s.metaText}>with {teacherName}</Text>
          </View>
        ) : null}

        {childName ? (
          <View style={s.metaRow}>
            <ClipboardList size={12} color={colors.muted} />
            <Text style={s.metaText}>{childName}</Text>
          </View>
        ) : null}

        {a.notes ? (
          <Text style={s.assessNote}>"{a.notes}"</Text>
        ) : null}
      </View>

      {/* Status badge */}
      <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
        {a.status === 'scheduled' ? (
          <Check size={11} color={statusStyle.fg} style={{ marginRight: 3 }} />
        ) : null}
        <Text style={[s.statusText, { color: statusStyle.fg }]}>
          {STATUS_LABEL[a.status]}
        </Text>
      </View>
    </View>
  );
}

/* ── AssessmentsPage ─────────────────────────────────────────── */
export function AssessmentsPage({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient  = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: qk.assessments(familyId ?? ''),
    queryFn:  () => dataClient.getAssessments!(familyId!),
    enabled:  !!familyId,
  });

  const { upcoming, past } = useMemo(() => {
    const upcoming = assessments
      .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a, b) => {
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return a.scheduled_date.localeCompare(b.scheduled_date);
      });

    const past = assessments
      .filter(a => a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => {
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return b.scheduled_date.localeCompare(a.scheduled_date);
      });

    return { upcoming, past };
  }, [assessments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await queryClient.invalidateQueries({ queryKey: qk.assessments(familyId ?? '') }); }
    finally { setRefreshing(false); }
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
    >
      {/* ── Header ── */}
      <View style={s.toolbar}>
        <View style={s.toolbarText}>
          <Text style={s.pageTitle}>Your assessments</Text>
          <Text style={s.pageSub}>Track upcoming and past assessments for your children.</Text>
        </View>
        <Button
          label="Book"
          icon={CalendarDays}
          onPress={() => navigation.navigate('BookAssessment')}
          style={{ flexShrink: 0 }}
        />
      </View>

      {/* ── Loading ── */}
      {isLoading && (
        <View style={{ gap: 12 }}>
          <Skeleton height={100} borderRadius={14} />
          <Skeleton height={100} borderRadius={14} />
        </View>
      )}

      {/* ── Empty ── */}
      {!isLoading && assessments.length === 0 && (
        <View style={[s.emptyCard, shadow.card as object]}>
          <Text style={s.emptyText}>
            No assessments yet. Book an initial assessment to get started.
          </Text>
          <Button
            label="Book an assessment"
            icon={CalendarDays}
            onPress={() => navigation.navigate('BookAssessment')}
            style={{ marginTop: 14 }}
          />
        </View>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Upcoming</Text>
          {upcoming.map(a => <AssessmentCard key={a.id} a={a as any} />)}
        </View>
      )}

      {/* ── Past ── */}
      {past.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Past</Text>
          {past.map(a => <AssessmentCard key={a.id} a={a as any} />)}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  toolbar: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  toolbarText: { flex: 1 },
  pageTitle:   { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: colors.muted, lineHeight: 18 },

  section:      { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },

  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },

  /* ── Assessment card ── */
  assessCard: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.line,
    flexDirection: 'row', overflow: 'hidden',
    alignItems: 'stretch',
  },
  stripe: { width: 4 },
  dateBlock: {
    width: 52, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay:  { fontSize: 9,  fontWeight: '700', letterSpacing: 0.5 },
  dateNum:  { fontSize: 18, fontWeight: '800', marginTop: 1 },
  dateMon:  { fontSize: 9,  fontWeight: '600', marginTop: 1 },
  assessMain: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 3 },
  assessEyebrow: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  assessTitle:   { fontSize: 14, fontWeight: '700', color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaText:{ fontSize: 12, color: colors.muted },
  assessNote: { fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'center', margin: 10,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
  },
  statusText: { fontSize: 10, fontWeight: '700' },
});
