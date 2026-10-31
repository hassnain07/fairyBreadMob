import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardList,
} from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { ChildSwitcher } from '@/components/domain/ChildSwitcher';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { Skeleton } from '@/components/ui/Skeleton';
import { useChildren } from '../hooks/useChildren';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { useTerms } from '../hooks/useTerms';
import { useBookings } from '../hooks/useBookings';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import { getActiveTerm } from '@/lib/utils/termUtils';
import type { ParentTabParamList } from '@/app/navigation/types';

type Props = BottomTabScreenProps<ParentTabParamList, 'ParentHome'>;

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  Mathematics: { bg: colors.avatar.pink.bg,   text: colors.avatar.pink.fg   },
  English:     { bg: colors.avatar.teal.bg,   text: colors.avatar.teal.fg   },
  Reading:     { bg: colors.avatar.orange.bg, text: colors.avatar.orange.fg },
  Science:     { bg: colors.avatar.green.bg,  text: colors.avatar.green.fg  },
};
const defaultSubjectColor = { bg: colors.yellowSoft, text: colors.avatar.yellow.fg };

const QUICK_ACTIONS = [
  { label: 'Book\nassessment', icon: ClipboardList, bg: colors.pinkSoft,   fg: colors.avatar.pink.fg,   screen: 'MyAssessments' as const, target: 'more' },
  { label: 'Book a class',    icon: CalendarDays,   bg: colors.orangeSoft, fg: colors.avatar.orange.fg, screen: 'Book'         as const, target: 'tab'  },
  { label: 'View reports',    icon: BarChart3,       bg: colors.tealSoft,   fg: colors.avatar.teal.fg,   screen: 'Reports'      as const, target: 'more' },
  { label: 'Make payment',    icon: CircleDollarSign,bg: colors.yellowSoft, fg: colors.avatar.yellow.fg, screen: 'Payments'     as const, target: 'more' },
] as const;

export function ParentHomeScreen({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);

  const { data: children = [], isLoading: childrenLoading } = useChildren(familyId);
  const { data: gating,        isLoading: gatingLoading   } = useFamilyGating(familyId);
  const { data: terms = [] } = useTerms(familyId);
  const { data: bookings = []                              } = useBookings(familyId);

  const activeTerm = useMemo(() => getActiveTerm(terms), [terms]);

  const selectedChild = useMemo(() => children[selectedChildIdx], [children, selectedChildIdx]);

  const { data: reports = [] } = useQuery({
    queryKey: qk.reports(selectedChild?.id ?? ''),
    queryFn:  () => dataClient.getReportsForChild(selectedChild!.id),
    enabled:  !!selectedChild?.id,
  });

  const upcomingBookings = useMemo(() => {
    if (!selectedChild) return [];
    const now = new Date();
    return bookings
      .filter(b =>
        b.child_id === selectedChild.id &&
        b.status   === 'confirmed' &&
        b.session  &&
        new Date(b.session.starts_at) > now
      )
      .sort((a, b) =>
        new Date(a.session!.starts_at).getTime() -
        new Date(b.session!.starts_at).getTime()
      )
      .slice(0, 3);
  }, [bookings, selectedChild]);

  const termBookings = useMemo(() => {
    if (!selectedChild) return 0;
    return bookings.filter(b => b.child_id === selectedChild.id && b.status === 'confirmed').length;
  }, [bookings, selectedChild]);

  const latestReport = useMemo(
    () => (reports.length > 0 ? reports[reports.length - 1] : null),
    [reports]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['children',      familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['bookings',      familyId] });
      if (selectedChild?.id) {
        await queryClient.invalidateQueries({ queryKey: ['reports', selectedChild.id] });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const nav = (screen: string, target: 'tab' | 'more' = 'more') => {
    if (target === 'tab') {
      navigation.navigate(screen as any);
    } else {
      // Screens like Assessments/Reports/Payments live inside the
      // ParentMore stack, so we navigate to that tab then push the screen.
      (navigation as any).navigate('ParentMore', { screen: screen as any });
    }
  };

  /* ── Loading ── */
  if (childrenLoading || gatingLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={180} borderRadius={16} />
        <Skeleton height={110} borderRadius={16} />
        <Skeleton height={160} borderRadius={16} />
        <Skeleton height={130} borderRadius={16} />
      </ScrollView>
    );
  }

  /* ── No children ── */
  if (!selectedChild) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No children added yet</Text>
          <Text style={styles.emptyBody}>
            Start by adding your first child to get set up.
          </Text>
          <Button label="Add your first child" onPress={() => nav('MyChildren')} />
        </View>
      </ScrollView>
    );
  }

  const firstName = selectedChild.givenName || selectedChild.name.split(' ')[0];
  const subjectColor = (s: string) => SUBJECT_COLORS[s] ?? defaultSubjectColor;
  const progressPct  = Math.min(100, Math.round((termBookings / 10) * 100));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
    >
      {/* ── Child Switcher ── */}
      {children.length > 1 && (
        <ChildSwitcher
          children={children}
          selectedChildId={selectedChild.id}
          onSelectChild={child => {
            const idx = children.findIndex(c => c.id === child.id);
            if (idx >= 0) setSelectedChildIdx(idx);
          }}
        />
      )}

      {/* ── Welcome Card ── */}
      <LinearGradient
        colors={['#fff1f5', '#fff9e3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeCard}
      >
        {/* Decorative sun */}
        <View style={styles.sunCircle} />

        <Text style={styles.eyebrow}>Your family dashboard</Text>
        <Text style={styles.welcomeHeading}>
          A little progress{'\n'}
          <Text style={styles.welcomeItalic}>goes a long way.</Text>
        </Text>
        <Text style={styles.welcomeSub}>
          {firstName} is on a great learning journey.
        </Text>

        <TouchableOpacity style={styles.welcomeLink} onPress={() => nav('MyChildren')}>
          <Text style={styles.welcomeLinkText}>View {firstName}'s progress</Text>
          <ArrowRight size={14} color={colors.pink} />
        </TouchableOpacity>

        {/* Trophy badge */}
        <View style={styles.trophyBadge}>
          <Text style={styles.trophyStar}>★</Text>
        </View>
      </LinearGradient>

      {/* ── Term Credit Meter ── */}
      {activeTerm && (
        <TermCreditMeter term={activeTerm} />
      )}

      {/* ── Progress Card (full-width) ── */}
      <View style={[styles.card, shadow.card as object]}>
        {/* heading row */}
        <View style={styles.cardHeadRow}>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardEyebrow}>{selectedChild.name} · {selectedChild.year}</Text>
            <Text style={styles.cardTitle}>{firstName} is doing great!</Text>
          </View>
          <View style={styles.roundCheck}>
            <Check size={16} color={colors.status.success.fg} />
          </View>
        </View>

        {termBookings > 0 ? (
          <View style={styles.progressRow}>
            {/* Ring */}
            <View style={styles.ring}>
              <Text style={styles.ringNumber}>{termBookings}</Text>
            </View>

            {/* Info */}
            <View style={styles.progressText}>
              <Text style={styles.progressLabel}>Sessions this term</Text>
              <Text style={styles.progressSub}>
                {termBookings} class{termBookings !== 1 ? 'es' : ''} booked
              </Text>

              {/* Bar */}
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${progressPct}%` }]} />
              </View>

              <TouchableOpacity onPress={() => nav('Bookings', 'tab')}>
                <Text style={styles.progressLink}>View bookings  →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyBody}>No classes booked yet this term.</Text>
        )}
      </View>

      {/* ── Quick Actions (full-width 2×2) ── */}
      <View style={[styles.card, shadow.card as object]}>
        <Text style={styles.cardEyebrow}>Quick actions</Text>
        <Text style={styles.cardTitle}>What would you like to do?</Text>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(({ label, icon: Icon, bg, fg, screen, target }) => (
            <TouchableOpacity
              key={screen}
              style={styles.quickBtn}
              onPress={() => nav(screen, target)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIconBox, { backgroundColor: bg }]}>
                <Icon size={20} color={fg} />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Upcoming Classes (full-width) ── */}
      {upcomingBookings.length > 0 && (
        <View style={[styles.card, shadow.card as object]}>
          <View style={styles.sectionHeadRow}>
            <View>
              <Text style={styles.cardEyebrow}>This week</Text>
              <Text style={styles.cardTitle}>Upcoming classes</Text>
            </View>
            <TouchableOpacity onPress={() => nav('Bookings', 'tab')}>
              <Text style={styles.linkText}>See all  →</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.map((b, i) => {
            const d    = new Date(b.session!.starts_at);
            const col  = subjectColor(b.session!.subject);
            const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
            const isLast = i === upcomingBookings.length - 1;

            return (
              <View
                key={b.id}
                style={[styles.classRow, !isLast && styles.classRowBorder]}
              >
                {/* Date block */}
                <View style={[styles.dateBlock, { backgroundColor: col.bg }]}>
                  <Text style={[styles.dateDay, { color: col.text }]}>
                    {DAYS[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, { color: col.text }]}>
                    {d.getDate()}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.classInfo}>
                  <Text style={styles.classSubject}>{b.session!.subject}</Text>
                  <Text style={styles.classMeta}>{time} · {b.session!.teacher_name}</Text>
                </View>

                {/* Status */}
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>Confirmed</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Latest Report Note ── */}
      {latestReport?.note ? (
        <View style={[styles.card, styles.noticeCard, shadow.card as object]}>
          <Text style={styles.noticeSymbol}>✦</Text>
          <Text style={styles.cardEyebrow}>Latest report note</Text>
          <Text style={styles.noticeQuote}>"{latestReport.note}"</Text>
        </View>
      ) : null}

      {/* ── Child Summary ── */}
      <View style={[styles.card, shadow.card as object]}>
        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.cardEyebrow}>Your children</Text>
            <Text style={styles.cardTitle}>Growing every day</Text>
          </View>
          <TouchableOpacity onPress={() => nav('MyChildren')}>
            <Text style={styles.linkText}>View all  →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.childRow}>
          <View style={styles.childAvatar}>
            <Text style={styles.childInitials}>{selectedChild.initials}</Text>
          </View>

          <View style={styles.childMeta}>
            <Text style={styles.childName}>{selectedChild.name}</Text>
            <Text style={styles.childSub}>
              {selectedChild.year}
              {selectedChild.school ? ` · ${selectedChild.school}` : ''}
            </Text>
          </View>
        </View>

        {latestReport && latestReport.subjects.length > 0 && (
          <View style={styles.metricsRow}>
            {latestReport.subjects.slice(0, 3).map(s => (
              <View key={s.subject} style={styles.metricPill}>
                <Text style={styles.metricPct}>{s.rating * 20}%</Text>
                <Text style={styles.metricSubject}>{s.subject}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  /* Empty / loading */
  emptyWrap:  { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyTitle: { ...type.h3, color: colors.ink, textAlign: 'center' },
  emptyBody:  { ...type.body, color: colors.muted, textAlign: 'center' },

  /* ── Welcome card ── */
  welcomeCard: {
    borderRadius:  16,
    padding:       24,
    paddingRight:  80,       // leave room for trophy
    overflow:      'hidden',
    position:      'relative',
    minHeight:     180,
  },
  sunCircle: {
    position:    'absolute',
    right:       -24,
    top:         -24,
    width:       150,
    height:      150,
    borderRadius:75,
    backgroundColor: '#F6CA42',
    opacity:     0.25,
  },
  eyebrow: {
    fontSize:    11,
    fontWeight:  '600',
    color:       colors.mutedSoft,
    letterSpacing:0.8,
    textTransform:'uppercase',
    marginBottom:8,
  },
  welcomeHeading: {
    fontSize:    26,
    fontWeight:  '700',
    color:       colors.ink,
    lineHeight:  32,
    marginBottom:8,
  },
  welcomeItalic: {
    fontStyle: 'italic',
    color:     colors.pink,
  },
  welcomeSub: {
    fontSize:    13,
    color:       colors.muted,
    marginBottom:16,
    lineHeight:  18,
  },
  welcomeLink: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  welcomeLinkText: {
    fontSize:   13,
    fontWeight: '600',
    color:      colors.pink,
  },
  trophyBadge: {
    position:        'absolute',
    right:           16,
    bottom:          16,
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  trophyStar: { fontSize: 20 },

  /* ── Generic card ── */
  card: {
    backgroundColor: colors.card,
    borderRadius:    16,
    padding:         18,
    borderWidth:     1,
    borderColor:     colors.line,
  },

  /* Card header */
  cardHeadRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   16,
    gap:            12,
  },
  cardHeadText: { flex: 1 },
  cardEyebrow: {
    fontSize:     10,
    fontWeight:   '600',
    color:        colors.mutedSoft,
    letterSpacing:0.7,
    textTransform:'uppercase',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize:   16,
    fontWeight: '700',
    color:      colors.ink,
    lineHeight: 22,
  },
  roundCheck: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: colors.status.success.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },

  /* Progress row */
  progressRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           16,
  },
  ring: {
    width:           72,
    height:          72,
    borderRadius:    36,
    borderWidth:     7,
    borderColor:     colors.pink,
    backgroundColor: colors.pinkSoft,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  ringNumber: {
    fontSize:   22,
    fontWeight: '800',
    color:      colors.pink,
  },
  progressText: { flex: 1 },
  progressLabel: {
    fontSize:     13,
    fontWeight:   '700',
    color:        colors.ink,
    marginBottom: 2,
  },
  progressSub: {
    fontSize:     12,
    color:        colors.muted,
    marginBottom: 8,
  },
  barTrack: {
    height:       5,
    borderRadius: 3,
    backgroundColor: colors.pinkSoft,
    overflow:     'hidden',
    marginBottom: 8,
  },
  barFill: {
    height:       '100%',
    borderRadius: 3,
    backgroundColor: colors.pink,
  },
  progressLink: {
    fontSize:   12,
    fontWeight: '600',
    color:      colors.pink,
  },

  /* Quick actions */
  quickGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginTop:     14,
  },
  quickBtn: {
    width:           '47.5%',
    backgroundColor: colors.surface2,
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     colors.line,
    alignItems:      'flex-start',
    gap:             10,
  },
  quickIconBox: {
    width:        38,
    height:       38,
    borderRadius: 10,
    alignItems:   'center',
    justifyContent:'center',
  },
  quickLabel: {
    fontSize:   12,
    fontWeight: '600',
    color:      colors.ink,
    lineHeight: 16,
  },

  /* Section header row */
  sectionHeadRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   16,
    gap:            8,
  },
  linkText: {
    fontSize:   13,
    fontWeight: '600',
    color:      colors.pink,
    paddingTop: 2,
  },

  /* Class rows */
  classRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    paddingVertical:12,
  },
  classRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dateBlock: {
    width:        46,
    height:       46,
    borderRadius: 10,
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  dateDay: {
    fontSize:   8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateNum: {
    fontSize:   16,
    fontWeight: '800',
    marginTop:  1,
  },
  classInfo: { flex: 1 },
  classSubject: {
    fontSize:   14,
    fontWeight: '700',
    color:      colors.ink,
    marginBottom:2,
  },
  classMeta: {
    fontSize: 12,
    color:    colors.muted,
  },
  confirmedBadge: {
    backgroundColor: colors.status.success.bg,
    borderRadius:    20,
    paddingHorizontal:10,
    paddingVertical:  4,
  },
  confirmedText: {
    fontSize:   11,
    fontWeight: '700',
    color:      colors.status.success.fg,
  },

  /* Notice card */
  noticeCard: { gap: 6 },
  noticeSymbol: {
    fontSize: 22,
    color:    colors.pink,
  },
  noticeQuote: {
    fontSize:   14,
    color:      colors.ink,
    fontStyle:  'italic',
    lineHeight: 20,
    marginTop:  4,
  },

  /* Child summary */
  childRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    marginTop:     14,
    marginBottom:  4,
  },
  childAvatar: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: colors.avatar.pink.bg,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  childInitials: {
    fontSize:   15,
    fontWeight: '700',
    color:      colors.avatar.pink.fg,
  },
  childMeta: { flex: 1 },
  childName: {
    fontSize:   14,
    fontWeight: '700',
    color:      colors.ink,
    marginBottom:2,
  },
  childSub: {
    fontSize: 12,
    color:    colors.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap:           8,
    marginTop:     12,
    flexWrap:      'wrap',
  },
  metricPill: {
    backgroundColor: colors.pinkSoft,
    borderRadius:    20,
    paddingHorizontal:12,
    paddingVertical:  6,
    alignItems:      'center',
  },
  metricPct: {
    fontSize:   13,
    fontWeight: '800',
    color:      colors.pink,
  },
  metricSubject: {
    fontSize:   10,
    color:      colors.muted,
    marginTop:  1,
  },
});
