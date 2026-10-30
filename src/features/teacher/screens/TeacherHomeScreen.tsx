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
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassSession } from '@/types/teacher';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function greet(firstName: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${firstName}.`;
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, bg, fg, icon: Icon }: {
  label: string; value: string;
  bg: string; fg: string;
  icon: React.ComponentType<any>;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <View style={[styles.statIcon, { backgroundColor: fg + '22' }]}>
        <Icon size={16} color={fg} strokeWidth={2} />
      </View>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg + 'AA' }]}>{label}</Text>
    </View>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session, onAttendance }: { session: ClassSession; onAttendance: () => void }) {
  const start = timeLabel(session.starts_at);
  const isPending = session.status === 'scheduled';

  return (
    <View style={[styles.sessionCard, shadow.card]}>
      <View style={styles.sessionTimeBlock}>
        <Text style={styles.sessionTime}>{start}</Text>
      </View>

      <View style={styles.sessionBody}>
        <Text style={styles.sessionSubject}>{session.subject}</Text>
        <Text style={styles.sessionMeta}>
          {session.booked_count}/{session.capacity} enrolled
        </Text>
      </View>

      {isPending && (
        <TouchableOpacity
          style={styles.attendanceBtn}
          onPress={onAttendance}
          activeOpacity={0.75}
        >
          <Text style={styles.attendanceBtnText}>Attendance</Text>
          <ArrowRight size={12} color={colors.teal} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function TeacherHomeScreen({ navigation }: any) {
  const { user, teacherId } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString();
  }, []);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: qk.sessions({ teacherId, from: todayStart, to: todayEnd }),
    queryFn: () => dataClient.getUpcomingSessions({ teacherId: teacherId ?? undefined, from: todayStart, to: todayEnd }),
    enabled: !!teacherId,
    staleTime: 60_000,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: qk.teacherBookings,
    queryFn: () => dataClient.getBookingsForTeacher(),
    enabled: !!teacherId,
    staleTime: 2 * 60_000,
  });

  const totalStudents = useMemo(() => {
    const ids = new Set(bookings.filter(b => b.status === 'confirmed').map(b => b.child_id));
    return ids.size;
  }, [bookings]);

  const pendingAttendance = sessions.filter(s => s.status === 'scheduled').length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teacherBookings });
    await qc.invalidateQueries({ queryKey: qk.sessions({ teacherId, from: todayStart, to: todayEnd }) });
    setRefreshing(false);
  };

  const isLoading = sessionsLoading;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ─────────────────────────────────── */}
      <View style={styles.greetingWrap}>
        <Text style={styles.greeting}>{greet(user?.firstName ?? 'there')}</Text>
        <Text style={styles.greetingSub}>Here's your schedule for today.</Text>
      </View>

      {/* ── Stats row ────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatPill label="Today's classes"    value={String(sessions.length)} bg={colors.pinkSoft}   fg={colors.avatar.pink.fg}   icon={CalendarDays}    />
        <StatPill label="My students"        value={String(totalStudents)}   bg={colors.tealSoft}   fg={colors.avatar.teal.fg}   icon={GraduationCap}   />
        <StatPill label="Attendance pending" value={String(pendingAttendance)} bg={colors.orangeSoft} fg={colors.avatar.orange.fg} icon={ClipboardCheck}  />
      </View>

      {/* ── Today's classes ───────────────────────────── */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeadRow}>
          <View>
            <Text style={styles.cardEyebrow}>Today</Text>
            <Text style={styles.cardTitle}>Today's classes</Text>
          </View>
        </View>

        {isLoading && (
          <View style={{ gap: space.md }}>
            <Skeleton height={68} borderRadius={radius.md} />
            <Skeleton height={68} borderRadius={radius.md} />
          </View>
        )}

        {!isLoading && sessions.length === 0 && (
          <Text style={styles.emptyText}>No classes scheduled for today.</Text>
        )}

        {!isLoading && sessions.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            onAttendance={() => navigation.navigate('Attendance')}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  greetingWrap: { marginBottom: space.xs },
  greeting: {
    fontFamily:    'DMSans-SemiBold',
    fontSize:      24,
    lineHeight:    30,
    color:         colors.ink,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontFamily: 'DMSans-Regular',
    fontSize:   14,
    color:      colors.muted,
    marginTop:  4,
  },

  // stat pills
  statsRow: { flexDirection: 'row', gap: space.sm },
  statPill: {
    flex:          1,
    borderRadius:  radius.card,
    padding:       space.md,
    alignItems:    'flex-start',
    borderWidth:   1,
    gap:           4,
  },
  statIcon: {
    width:           28,
    height:          28,
    borderRadius:    8,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    2,
  },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 24 },
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
  },
  cardEyebrow: {
    fontFamily:    'DMSans-Bold',
    fontSize:      10,
    color:         colors.mutedSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  2,
  },
  cardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize:   16,
    color:      colors.ink,
  },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: space.lg },

  // session card
  sessionCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.md,
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        space.md,
    borderWidth:    1,
    borderColor:    colors.line,
  },
  sessionTimeBlock: {
    backgroundColor: colors.teal,
    borderRadius:    radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical:   space.xs,
    flexShrink:      0,
  },
  sessionTime: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#fff', letterSpacing: 0.3 },
  sessionBody: { flex: 1 },
  sessionSubject: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  sessionMeta:    { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  attendanceBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            3,
    backgroundColor: colors.tealSoft,
    borderRadius:   radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical:   space.xs,
    borderWidth:    1,
    borderColor:    colors.teal,
    flexShrink:     0,
  },
  attendanceBtnText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.teal },
});
