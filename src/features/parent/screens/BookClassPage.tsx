/**
 * BookClassPage — matches web portal BookClassPage exactly.
 *
 * Layout:
 *  - Child switcher (enrolled children only, hidden when single)
 *  - Toolbar: "Book a class" + subtitle
 *  - TermCreditMeter  (when ACTIVE_TERM)
 *  - UnlockBanner     (when no term / expired) — list still shown but buttons disabled
 *  - Enrolment gate   (when no enrolled children)
 *  - Sessions list    (colour-coded cards with subject accent)
 *  - Confirm bottom-sheet modal
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CircleDollarSign, Users, X } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { UnlockBanner } from '@/components/domain/UnlockBanner';
import { useChildren } from '../hooks/useChildren';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { useSessions } from '../hooks/useSessions';
import { useBookings } from '../hooks/useBookings';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassSession } from '@/types/teacher';
import type { Child } from '@/types/family';
import type { ParentTabParamList } from '@/app/navigation/types';

type Props = BottomTabScreenProps<ParentTabParamList, 'Book'>;

/* ─── subject colour map (matches web) ────────────────────────── */
const SUBJECT_ACCENT: Record<string, { stripe: string; bg: string; fg: string; pill: string }> = {
  Mathematics: { stripe: colors.pink,   bg: colors.pinkSoft,   fg: colors.avatar.pink.fg,   pill: '#fce9ef' },
  English:     { stripe: colors.teal,   bg: colors.tealSoft,   fg: colors.avatar.teal.fg,   pill: '#e8f3f7' },
  Reading:     { stripe: colors.orange, bg: colors.orangeSoft, fg: colors.avatar.orange.fg, pill: '#fef3e8' },
  Science:     { stripe: '#9B7FE8',     bg: '#EDE8FB',         fg: '#5B3DBD',               pill: '#EDE8FB' },
};
const defaultAccent = { stripe: colors.yellow, bg: colors.yellowSoft, fg: colors.avatar.yellow.fg, pill: '#fef3e8' };
const accent = (subject: string) => SUBJECT_ACCENT[subject] ?? defaultAccent;

/* ─── TeacherAvatar ────────────────────────────────────────────── */
function TeacherAvatar({ name, subject }: { name: string; subject: string }) {
  const col      = accent(subject);
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[sa.avatar, { backgroundColor: col.pill }]}>
      <Text style={[sa.initials, { color: col.fg }]}>{initials}</Text>
    </View>
  );
}
const sa = StyleSheet.create({
  avatar:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 11, fontWeight: '700' },
});

/* ─── SessionCard ──────────────────────────────────────────────── */
function SessionCard({
  session,
  isBooked,
  isFull,
  hasTerm,
  onPress,
}: {
  session: ClassSession;
  isBooked: boolean;
  isFull: boolean;
  hasTerm: boolean;
  onPress: () => void;
}) {
  const col   = accent(session.subject);
  const d     = new Date(session.starts_at);
  const day   = d.toLocaleDateString('en-AU', { weekday: 'long' });
  const time  = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  const spaces = session.spaces_left;

  const canBook = hasTerm && !isBooked && !isFull;
  const cardOpacity = (!hasTerm || isFull) && !isBooked ? 0.65 : 1;

  return (
    <TouchableOpacity
      style={[sc.card, shadow.card as object, { opacity: cardOpacity }]}
      onPress={canBook ? onPress : undefined}
      disabled={!canBook}
      activeOpacity={canBook ? 0.8 : 1}
    >
      {/* Subject stripe + top row */}
      <View style={[sc.topRow, { borderLeftColor: col.stripe }]}>
        {/* Subject pill */}
        <View style={[sc.subjectPill, { backgroundColor: col.bg }]}>
          <Text style={[sc.subjectText, { color: col.fg }]}>
            {session.subject.toUpperCase()}
          </Text>
        </View>

        {/* Space badge */}
        {isFull ? (
          <View style={sc.fullBadge}>
            <Text style={sc.fullBadgeText}>FULL</Text>
          </View>
        ) : (
          <View style={sc.spaceBadge}>
            <Users size={11} color={colors.muted} />
            <Text style={sc.spaceBadgeText}>
              {spaces} space{spaces !== 1 ? 's' : ''} available
            </Text>
          </View>
        )}
      </View>

      {/* Day + time */}
      <View style={sc.when}>
        <Text style={sc.dayText}>{day}</Text>
        <Text style={sc.timeText}>{time}</Text>
      </View>

      {/* Teacher row */}
      <View style={sc.tutorRow}>
        <TeacherAvatar name={session.teacher_name} subject={session.subject} />
        <Text style={sc.tutorText}>
          with <Text style={{ fontWeight: '700' }}>{session.teacher_name}</Text>
        </Text>
      </View>

      {/* Action row */}
      <View style={sc.actionRow}>
        {isBooked ? (
          <View style={sc.bookedRow}>
            <Check size={15} color={colors.status.success.fg} />
            <Text style={sc.bookedText}>Booked</Text>
          </View>
        ) : isFull ? (
          <View style={[sc.disabledBtn]}>
            <Users size={15} color={colors.muted} />
            <Text style={sc.disabledBtnText}>Class full</Text>
          </View>
        ) : hasTerm ? (
          <TouchableOpacity style={[sc.bookBtn, { backgroundColor: col.stripe }]} onPress={onPress} activeOpacity={0.85}>
            <Check size={15} color="#fff" />
            <Text style={sc.bookBtnText}>Confirm booking</Text>
          </TouchableOpacity>
        ) : (
          <View style={[sc.disabledBtn]}>
            <CircleDollarSign size={15} color={colors.muted} />
            <Text style={sc.disabledBtnText}>Purchase term first</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.line, overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderLeftWidth: 4,
  },
  subjectPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subjectText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  fullBadge:   { backgroundColor: colors.status.danger.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  fullBadgeText: { fontSize: 10, fontWeight: '700', color: colors.status.danger.fg },
  spaceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spaceBadgeText: { fontSize: 11, color: colors.muted },
  when: { paddingHorizontal: 16, paddingBottom: 8 },
  dayText:  { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 1 },
  timeText: { fontSize: 13, color: colors.muted },
  tutorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  tutorText:   { fontSize: 13, color: colors.muted },
  actionRow: {
    borderTopWidth: 1, borderTopColor: colors.line,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  bookedRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookedText: { fontSize: 13, fontWeight: '600', color: colors.status.success.fg },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 11, borderRadius: 10,
  },
  bookBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabledBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 11, borderRadius: 10,
    backgroundColor: colors.surface,
  },
  disabledBtnText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});

/* ─── EnrolGateBanner ──────────────────────────────────────────── */
function EnrolGateBanner({ childCount, onAddChild, onEnrol }: {
  childCount: number;
  onAddChild: () => void;
  onEnrol: () => void;
}) {
  return (
    <View style={eb.wrap}>
      <Text style={eb.icon}>🎒</Text>
      <View style={eb.text}>
        <Text style={eb.title}>No enrolled children yet</Text>
        <Text style={eb.body}>
          {childCount > 0
            ? `You have ${childCount} child${childCount > 1 ? 'ren' : ''} added but none enrolled yet.`
            : 'Add and enrol a child to get started.'}
        </Text>
      </View>
      <View style={eb.actions}>
        {childCount === 0 && (
          <TouchableOpacity style={[eb.btn, { borderColor: colors.line }]} onPress={onAddChild}>
            <Text style={[eb.btnText, { color: colors.ink }]}>Add a child</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[eb.btn, { backgroundColor: colors.pink, borderColor: colors.pink }]} onPress={onEnrol}>
          <Text style={[eb.btnText, { color: '#fff' }]}>Enrol now</Text>
          <ArrowRight size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const eb = StyleSheet.create({
  wrap: {
    backgroundColor: colors.pinkSoft, borderRadius: 16, borderWidth: 1,
    borderColor: '#F9D4E4', padding: 18, gap: 12,
  },
  icon: { fontSize: 28 },
  text: { gap: 4 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  body:  { fontSize: 13, color: colors.muted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: colors.card,
  },
  btnText: { fontSize: 13, fontWeight: '600' },
});

/* ─── ChildSwitcherRow ─────────────────────────────────────────── */
function ChildSwitcherRow({ children, selectedId, onSelect }: {
  children: Child[];
  selectedId: string;
  onSelect: (c: Child) => void;
}) {
  if (children.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.row} contentContainerStyle={{ gap: 8 }}>
      {children.map(c => {
        const active = c.id === selectedId;
        return (
          <TouchableOpacity
            key={c.id}
            style={[cs.chip, active && cs.chipActive]}
            onPress={() => onSelect(c)}
            activeOpacity={0.8}
          >
            <View style={[cs.avatar, { backgroundColor: active ? '#fff3' : colors.avatar.pink.bg }]}>
              <Text style={[cs.initials, { color: active ? '#fff' : colors.avatar.pink.fg }]}>{c.initials}</Text>
            </View>
            <Text style={[cs.name, active && cs.nameActive]}>
              {c.givenName ?? c.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const cs = StyleSheet.create({
  row:       { marginBottom: 4 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface2, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: colors.line },
  chipActive:{ backgroundColor: colors.pink, borderColor: colors.pink },
  avatar:    { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  initials:  { fontSize: 10, fontWeight: '700' },
  name:      { fontSize: 13, fontWeight: '600', color: colors.ink },
  nameActive:{ color: '#fff' },
});

/* ═════════════════════════════════════════════════════════════════
   BookClassPage
═════════════════════════════════════════════════════════════════ */
export function BookClassPage({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient  = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const [confirming, setConfirming] = useState<ClassSession | null>(null);
  const [bookError,  setBookError]  = useState('');

  /* ── queries ── */
  const { data: children  = [], isLoading: loadingChildren  } = useChildren(familyId);
  const { data: gating,         isLoading: loadingGating    } = useFamilyGating(familyId);
  const { data: sessions  = [], isLoading: loadingSessions  } = useSessions({ days: 7 });
  const { data: bookings  = []                               } = useBookings(familyId);

  /* ── derived ── */
  const enrolledChildren = useMemo(() => children.filter(c => c.enrolled), [children]);
  const selectedChild    = enrolledChildren[selectedChildIdx] ?? enrolledChildren[0];

  React.useEffect(() => {
    // Keep index in bounds when children list changes
    if (selectedChildIdx >= enrolledChildren.length && enrolledChildren.length > 0) {
      setSelectedChildIdx(0);
    }
  }, [enrolledChildren.length]);

  const bookedSessionIds = useMemo(
    () => new Set(
      bookings
        .filter(b => b.child_id === selectedChild?.id && b.status === 'confirmed')
        .map(b => b.class_session_id)
    ),
    [bookings, selectedChild]
  );

  const hasTerm = gating?.state === 'ACTIVE_TERM';
  const isLoading = loadingChildren || loadingGating;

  /* ── booking mutation ── */
  const bookMutation = useMutation({
    mutationFn: (session: ClassSession) =>
      dataClient.bookClassSession(selectedChild!.id, session.id),
    onSuccess: (_, session) => {
      queryClient.invalidateQueries({ queryKey: qk.bookings(familyId ?? '') });
      queryClient.invalidateQueries({ queryKey: qk.sessions() });
      queryClient.invalidateQueries({ queryKey: qk.terms(familyId ?? '') });
      setConfirming(null);
      setBookError('');
      // start a parent↔teacher conversation (fire-and-forget, matches web)
      if (session.teacher_id && familyId) {
        dataClient.startConversation('parent_teacher', { familyId, teacherId: session.teacher_id })
          .catch(() => {});
      }
    },
    onError: (e: any) => setBookError(e?.message ?? 'Failed to book. Please try again.'),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: qk.sessions() });
      await queryClient.invalidateQueries({ queryKey: qk.bookings(familyId ?? '') });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const childFirstName = selectedChild?.givenName ?? selectedChild?.name?.split(' ')[0] ?? 'your child';

  /* ── loading ── */
  if (isLoading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Skeleton height={28} borderRadius={6} style={{ width: '55%', marginBottom: 6 }} />
        <Skeleton height={16} borderRadius={4} style={{ width: '70%', marginBottom: 20 }} />
        <Skeleton height={120} borderRadius={14} />
        <Skeleton height={120} borderRadius={14} />
      </ScrollView>
    );
  }

  /* ── no enrolled children gate ── */
  if (enrolledChildren.length === 0) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.pageTitle}>Book a class</Text>
        <Text style={s.pageSub}>Choose a session for your child.</Text>
        <EnrolGateBanner
          childCount={children.length}
          onAddChild={() => (navigation as any).getParent()?.navigate('ParentMore', { screen: 'MyChildren' })}
          onEnrol={() => (navigation as any).getParent()?.navigate('ParentMore', { screen: 'Enrolment' })}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
      >
        {/* ── Child switcher (enrolled only, hidden when single) ── */}
        <ChildSwitcherRow
          children={enrolledChildren}
          selectedId={selectedChild?.id ?? ''}
          onSelect={c => setSelectedChildIdx(enrolledChildren.findIndex(e => e.id === c.id))}
        />

        {/* ── Page toolbar ── */}
        <View style={s.toolbar}>
          <Text style={s.pageTitle}>Book a class</Text>
          <Text style={s.pageSub}>Choose a session for {childFirstName}.</Text>
        </View>

        {/* ── Term credit meter ── */}
        {hasTerm && gating?.end_date && (
          <TermCreditMeter
            creditsRemaining={gating.classes_remaining ?? 0}
            creditsTotal={10}
            endDate={gating.end_date}
          />
        )}

        {/* ── No-term / expired unlock banner ── */}
        {!hasTerm && (
          <UnlockBanner
            type={gating?.state === 'TERM_EXPIRED' ? 'expired' : 'no_term'}
            onAction={() => (navigation as any).getParent()?.navigate('ParentMore', { screen: 'Payments' })}
          />
        )}

        {/* ── Sessions loading ── */}
        {loadingSessions && (
          <View style={{ gap: 12 }}>
            <Skeleton height={160} borderRadius={14} />
            <Skeleton height={160} borderRadius={14} />
            <Skeleton height={160} borderRadius={14} />
          </View>
        )}

        {/* ── Empty sessions ── */}
        {!loadingSessions && sessions.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No upcoming sessions available right now.</Text>
          </View>
        )}

        {/* ── Session cards ── */}
        {!loadingSessions && sessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isBooked={bookedSessionIds.has(session.id)}
            isFull={session.spaces_left === 0}
            hasTerm={hasTerm}
            onPress={() => { setConfirming(session); setBookError(''); }}
          />
        ))}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════
          Confirm booking bottom-sheet modal
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!confirming}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirming(null)}
      >
        <View style={s.backdropWrap}>
          <Pressable style={s.backdrop} onPress={() => setConfirming(null)} />

          <View style={s.sheet}>
            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={() => setConfirming(null)}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            {/* Icon + headings */}
            <View style={s.modalIcon}>
              <Check size={22} color={colors.pink} />
            </View>
            <Text style={s.modalTitle}>Confirm booking</Text>
            <Text style={s.modalSub}>This will use one session from your active term.</Text>

            {/* Review details */}
            {confirming && selectedChild && (
              <View style={s.reviewBox}>
                <ReviewRow label="Child"   value={selectedChild.name} />
                <ReviewRow label="Subject" value={confirming.subject} />
                <ReviewRow
                  label="Date"
                  value={new Date(confirming.starts_at).toLocaleDateString('en-AU', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                />
                <ReviewRow
                  label="Time"
                  value={new Date(confirming.starts_at).toLocaleTimeString('en-AU', {
                    hour: 'numeric', minute: '2-digit',
                  })}
                />
                <ReviewRow label="Tutor"   value={confirming.teacher_name} last />
              </View>
            )}

            {bookError ? (
              <Text style={s.bookError}>{bookError}</Text>
            ) : null}

            <Button
              label={bookMutation.isPending ? 'Booking…' : 'Yes, confirm booking'}
              icon={Check}
              onPress={() => confirming && bookMutation.mutate(confirming)}
              loading={bookMutation.isPending}
              disabled={bookMutation.isPending}
              fullWidth
              style={{ marginTop: 8 }}
            />
            <TouchableOpacity style={s.cancelLink} onPress={() => setConfirming(null)}>
              <Text style={s.cancelText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[rr.row, !last && rr.border]}>
      <Text style={rr.label}>{label}</Text>
      <Text style={rr.value}>{value}</Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  border:{ borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'right', flex: 1, marginLeft: 12 },
});

/* ─── page-level styles ────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  toolbar:   { gap: 4 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.ink },
  pageSub:   { fontSize: 13, color: colors.muted, lineHeight: 18 },

  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  /* modal */
  backdropWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop:     { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
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
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: colors.muted, marginBottom: 18, lineHeight: 18 },
  reviewBox: {
    backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 16,
  },
  bookError:   { fontSize: 13, color: colors.error.fg, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  cancelLink:  { alignItems: 'center', paddingVertical: 14 },
  cancelText:  { fontSize: 14, color: colors.muted },
});
