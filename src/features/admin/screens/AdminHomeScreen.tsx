import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { AdminStats } from '@/types/admin';
import type { ClassSession } from '@/types/teacher';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const TEACHER_DOT: Record<string, string> = {
  pink:    colors.pink,
  teal:    colors.teal,
  yellow:  colors.yellow,
  orange:  colors.orange,
  green:   colors.green,
  magenta: colors.magenta,
};

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatProps {
  label: string;
  value: string | number;
  bg: string;
  fg: string;
  icon: React.ComponentType<any>;
}

function StatCard({ label, value, bg, fg, icon: Icon }: StatProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <View style={[styles.statIcon, { backgroundColor: fg + '22' }]}>
        <Icon size={17} color={fg} strokeWidth={2} />
      </View>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg + 'CC' }]}>{label}</Text>
    </View>
  );
}

// ── Attendance chart ──────────────────────────────────────────────────────────

function AttendanceChart({ data }: { data: { week: string; rate: number }[] }) {
  const bars = data.length > 0 ? data : Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, rate: 0 }));

  return (
    <View style={styles.chartWrap}>
      {/* Y-axis labels */}
      <View style={styles.chartY}>
        {['100', '75', '50', '25', '0'].map(pct => (
          <Text key={pct} style={styles.chartYLabel}>{pct}%</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={styles.chartArea}>
        <View style={styles.chartBars}>
          {bars.map((w, i) => {
            const h = Math.max(2, Math.min(100, w.rate));
            const hasData = w.rate > 0;
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${h}%`, backgroundColor: hasData ? colors.pink : colors.line },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Today's session row ───────────────────────────────────────────────────────

function TodayRow({ session }: { session: ClassSession }) {
  const dotColor = TEACHER_DOT[session.teacher_color] ?? colors.muted;
  return (
    <View style={styles.todayRow}>
      <Text style={styles.todayTime}>{timeLabel(session.starts_at)}</Text>
      <View style={[styles.todayDot, { backgroundColor: dotColor }]} />
      <View style={styles.todayBody}>
        <Text style={styles.todaySubject}>{session.subject}</Text>
        <Text style={styles.todayMeta}>
          {session.teacher_name} · {session.booked_count}/{session.capacity}
        </Text>
      </View>
      <View style={styles.todayStatusPill}>
        <Text style={styles.todayStatusText}>
          {session.status === 'scheduled' ? 'Upcoming' : session.status}
        </Text>
      </View>
    </View>
  );
}

// ── Nudge row ─────────────────────────────────────────────────────────────────

function NudgeRow({
  icon: Icon, iconBg, iconFg, title, subtitle, onPress,
}: {
  icon: React.ComponentType<any>;
  iconBg: string; iconFg: string;
  title: string; subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.nudgeRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.nudgeIcon, { backgroundColor: iconBg }]}>
        <Bell size={15} color={iconFg} strokeWidth={2} />
      </View>
      <View style={styles.nudgeBody}>
        <Text style={styles.nudgeTitle}>{title}</Text>
        <Text style={styles.nudgeSub}>{subtitle}</Text>
      </View>
      <ChevronRight size={16} color={colors.mutedSoft} />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminHomeScreen({ navigation }: any) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: qk.adminStats,
    queryFn:  () => dataClient.getAdminStats(),
    staleTime: 60_000,
  });

  const todayRange = useMemo(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to   = new Date(); to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: todaySessions = [] } = useQuery<ClassSession[]>({
    queryKey: qk.sessions(todayRange),
    queryFn:  () => dataClient.getUpcomingSessions(todayRange),
    staleTime: 60_000,
  });

  const dayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.adminStats });
    await qc.invalidateQueries({ queryKey: ['sessions'] });
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Stats grid ─────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={96} borderRadius={radius.card} style={{ flex: 1 }} />)}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Active students"       value={stats?.active_students ?? '—'}      bg={colors.pinkSoft}   fg={colors.avatar.pink.fg}   icon={GraduationCap}    />
          <StatCard label="Upcoming assessments"  value={stats?.upcoming_assessments ?? '—'} bg={colors.yellowSoft} fg={colors.avatar.yellow.fg} icon={ClipboardList}    />
          <StatCard label="Classes today"         value={stats?.classes_today ?? '—'}        bg={colors.tealSoft}   fg={colors.avatar.teal.fg}   icon={CalendarDays}     />
          <StatCard label="Pending payments"      value={stats?.pending_payments ?? '—'}     bg={colors.orangeSoft} fg={colors.avatar.orange.fg} icon={CircleDollarSign}/>
          <StatCard label="Reports due"          value={stats?.reports_due ?? '—'}          bg={colors.greenSoft}   fg={colors.avatar.green.fg}  icon={FileText}         />
          <StatCard label="Revenue this month"   value={stats ? formatMoney(stats.revenue_this_month_cents) : '—'} bg={'#F8E3F2'} fg={colors.magenta} icon={TrendingUp} />
        </View>
      )}

      {/* ── Attendance chart ─────────────────────────────────── */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeadRow}>
          <View>
            <Text style={styles.cardEyebrow}>Term at a glance</Text>
            <Text style={styles.cardTitle}>Attendance rate</Text>
          </View>
          <View style={styles.chartRangePill}>
            <Text style={styles.chartRangeText}>Last 12 weeks</Text>
            <ChevronRight size={13} color={colors.muted} />
          </View>
        </View>
        <AttendanceChart data={stats?.weekly_attendance ?? []} />
      </View>

      {/* ── Today's rhythm ──────────────────────────────────── */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeadRow}>
          <View>
            <Text style={styles.cardEyebrow}>{dayLabel}</Text>
            <Text style={styles.cardTitle}>Today's rhythm</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminMore', { screen: 'Timetable' })}
            hitSlop={8}
          >
            <Text style={styles.linkText}>Timetable →</Text>
          </TouchableOpacity>
        </View>

        {todaySessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions scheduled today.</Text>
        ) : (
          <View style={{ gap: space.sm }}>
            {todaySessions.slice(0, 5).map(s => <TodayRow key={s.id} session={s} />)}
          </View>
        )}
      </View>

      {/* ── Little nudges ───────────────────────────────────── */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeadRow}>
          <View>
            <Text style={styles.cardEyebrow}>Needs your attention</Text>
            <Text style={styles.cardTitle}>Little nudges</Text>
          </View>
        </View>

        {stats && stats.pending_payments > 0 && (
          <NudgeRow
            icon={Bell}
            iconBg={colors.orangeSoft}
            iconFg={colors.avatar.orange.fg}
            title={`${stats.pending_payments} payment${stats.pending_payments !== 1 ? 's' : ''} to review`}
            subtitle="A friendly reminder may help"
            onPress={() => navigation.navigate('AdminPayments')}
          />
        )}
        {stats && stats.reports_due > 0 && (
          <NudgeRow
            icon={Bell}
            iconBg={colors.greenSoft}
            iconFg={colors.avatar.green.fg}
            title={`${stats.reports_due} report${stats.reports_due !== 1 ? 's' : ''} due this week`}
            subtitle="Prepare and share progress updates"
            onPress={() => navigation.navigate('AdminMore', { screen: 'Assessments' })}
          />
        )}
        {(!stats || (stats.pending_payments === 0 && stats.reports_due === 0)) && (
          <View style={styles.allCaughtUp}>
            <Text style={styles.emptyText}>All caught up! ✨</Text>
          </View>
        )}
      </View>

      {/* ── Quote card ──────────────────────────────────────── */}
      <View style={[styles.quoteCard, shadow.card]}>
        <Sparkles size={22} color={colors.pink} />
        <Text style={styles.quoteEyebrow}>A lovely little reminder</Text>
        <Text style={styles.quoteHeading}>
          Small steps{'\n'}
          <Text style={styles.quoteHeadingAccent}>add up.</Text>
        </Text>
        <Text style={styles.quoteBody}>Every session is a win worth celebrating.</Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  // stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap:     'wrap',
    gap:          space.sm,
  },
  statCard: {
    width:           '48.5%',
    borderRadius:    radius.card,
    padding:         space.md,
    alignItems:      'flex-start',
    borderWidth:     1,
    gap:             4,
  },
  statIcon: {
    width:           30,
    height:          30,
    borderRadius:    9,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    space.xs,
  },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 22, lineHeight: 26 },
  statLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, letterSpacing: 0.3, lineHeight: 14 },

  // card
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
    gap:             space.md,
  },
  cardHeadRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    gap:            space.sm,
  },
  cardEyebrow: {
    fontFamily:    'DMSans-Bold',
    fontSize:      10,
    color:         colors.mutedSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  2,
  },
  cardTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.ink },
  linkText:  { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.pink },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: space.sm },

  // attendance chart
  chartRangePill: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            2,
    backgroundColor: colors.surface,
    borderRadius:   radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical:   space.xs,
    borderWidth:    1,
    borderColor:    colors.line,
  },
  chartRangeText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.muted },
  chartWrap: { flexDirection: 'row', gap: space.sm, height: 130 },
  chartY: { justifyContent: 'space-between', paddingVertical: 2 },
  chartYLabel: { fontFamily: 'DMSans-Regular', fontSize: 9, color: colors.mutedSoft, lineHeight: 11 },
  chartArea: { flex: 1, justifyContent: 'flex-end' },
  chartBars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: '100%' },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { height: '100%', justifyContent: 'flex-end' },
  barFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },

  // today's rhythm
  todayRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.sm,
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        space.sm,
  },
  todayTime: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.ink, width: 48 },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  todayBody: { flex: 1 },
  todaySubject: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.ink },
  todayMeta:    { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },
  todayStatusPill: {
    backgroundColor:   colors.pinkSoft,
    borderRadius:      radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical:   3,
    flexShrink:        0,
  },
  todayStatusText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.pink },

  // nudges
  nudgeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.md,
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        space.md,
  },
  nudgeIcon: {
    width:           36,
    height:          36,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  nudgeBody: { flex: 1 },
  nudgeTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  nudgeSub:   { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },
  allCaughtUp: { paddingVertical: space.md, alignItems: 'center' },

  // quote card
  quoteCard: {
    backgroundColor:   '#FFF1F5',
    borderRadius:      radius.card,
    padding:           space.lg,
    borderWidth:       1,
    borderColor:      colors.avatar.pink.bg,
    gap:              space.sm,
  },
  quoteEyebrow: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.pink, letterSpacing: 0.8, textTransform: 'uppercase' },
  quoteHeading: { fontFamily: 'DMSans-SemiBold', fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.5 },
  quoteHeadingAccent: { fontFamily: 'Fraunces-Medium', fontStyle: 'italic', color: colors.pink },
  quoteBody: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20 },
});
