/**
 * BookingsPage — matches web portal BookingsPage exactly.
 *
 * Web features ported:
 *  - Toolbar: "Your week, sorted" + "Book another class" button
 *  - TermCreditMeter (active term)
 *  - Cancel-success inline banner (dismissable, matches web unlock-banner style)
 *  - booking-card layout:
 *      left colour stripe (4px, subject-coloured)
 *      date column: 3-line (DAY / date-num / MONTH)
 *      main section: subject label, "Subject with Teacher" h3, time, child name
 *      right column: status badge + cancel link
 *  - Status: Confirmed (green ✓), On waiting list (yellow), Awaiting payment (yellow)
 *  - policy-card at bottom (Clock icon)
 *  - Cancel modal: Clock icon, 24h warning, error display, confirm/keep buttons
 *  - After cancel: qk.bookings, qk.terms, qk.sessions, gating all invalidated
 *
 * Mobile adaptations:
 *  - date column is fixed 56px (not 60px)
 *  - booking-right row sits below main (full width) — matches web's mobile breakpoint exactly
 *  - Cancel link is a text link, not an outlined button (less crowded)
 *  - TermCreditMeter is full-width card above list
 *  - "Book another class" navigates to the Book tab
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
import { Check, ChevronRight, Clock3, Plus, UserRound, X } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { useBookings } from '../hooks/useBookings';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassBooking } from '@/types/booking';
import type { ParentTabParamList } from '@/app/navigation/types';

type Props = BottomTabScreenProps<ParentTabParamList, 'Bookings'>;

/* ── subject → accent colour (matches web COLORS map) ─────────── */
const SUBJECT_ACCENT: Record<string, { stripe: string; text: string; bg: string }> = {
  Mathematics: { stripe: colors.pink,   text: colors.avatar.pink.fg,   bg: colors.pinkSoft   },
  English:     { stripe: colors.teal,   text: colors.avatar.teal.fg,   bg: colors.tealSoft   },
  Reading:     { stripe: colors.orange, text: colors.avatar.orange.fg, bg: colors.orangeSoft },
  Science:     { stripe: '#9B7FE8',     text: '#5B3DBD',               bg: '#EDE8FB'          },
};
const defaultAccent = { stripe: colors.yellow, text: colors.avatar.yellow.fg, bg: colors.yellowSoft };
const subjectAccent = (s: string) => SUBJECT_ACCENT[s] ?? defaultAccent;

const DAYS   = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* ── BookingCard ───────────────────────────────────────────────── */
function BookingCard({
  booking,
  onCancel,
}: {
  booking: ClassBooking & { session?: any; child?: any };
  onCancel: (b: ClassBooking) => void;
}) {
  const session = booking.session;
  const child   = booking.child;
  const subject = session?.subject ?? '';
  const acc     = subjectAccent(subject);
  const d       = session?.starts_at ? new Date(session.starts_at) : null;
  const timeStr = d?.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) ?? '';

  return (
    <View style={[bc.card, shadow.card as object]}>
      {/* Subject-coloured left stripe */}
      <View style={[bc.stripe, { backgroundColor: acc.stripe }]} />

      {/* Date column */}
      <View style={[bc.dateCol, { borderRightColor: colors.line }]}>
        {d ? (
          <>
            <Text style={[bc.dateDay,  { color: acc.stripe }]}>{DAYS[d.getDay()]}</Text>
            <Text style={[bc.dateNum,  { color: acc.stripe }]}>{d.getDate()}</Text>
            <Text style={[bc.dateMon,  { color: acc.stripe }]}>{MONTHS[d.getMonth()]}</Text>
          </>
        ) : (
          <>
            <Text style={[bc.dateDay,  { color: colors.mutedSoft, fontSize: 8 }]}>TBC</Text>
            <Text style={[bc.dateNum,  { color: colors.mutedSoft }]}>—</Text>
          </>
        )}
      </View>

      {/* Main + right */}
      <View style={bc.body}>
        {/* booking-main */}
        <View style={bc.main}>
          <Text style={[bc.subjectLabel, { color: acc.stripe }]}>
            {subject || '—'}
          </Text>
          <Text style={bc.title}>
            {session ? `${session.subject} with ${session.teacher_name}` : 'Class'}
          </Text>
          {timeStr ? (
            <View style={bc.metaRow}>
              <Clock3 size={13} color={colors.muted} />
              <Text style={bc.metaText}>{timeStr}</Text>
            </View>
          ) : null}
          {child?.name ? (
            <View style={bc.metaRow}>
              <UserRound size={13} color={colors.muted} />
              <Text style={bc.metaText}>{child.name}</Text>
            </View>
          ) : null}
        </View>

        {/* booking-right (full width below main on mobile, matching web breakpoint) */}
        <View style={bc.right}>
          {/* Status badge */}
          {booking.status === 'confirmed' && (
            <View style={[bc.statusBadge, { backgroundColor: colors.status.success.bg }]}>
              <Check size={12} color={colors.status.success.fg} />
              <Text style={[bc.statusText, { color: colors.status.success.fg }]}>Confirmed</Text>
            </View>
          )}
          {booking.status === 'waiting_list' && (
            <View style={[bc.statusBadge, { backgroundColor: colors.status.pending.bg }]}>
              <Text style={[bc.statusText, { color: colors.status.pending.fg }]}>On waiting list</Text>
            </View>
          )}
          {booking.status === 'pending_payment' && (
            <View style={[bc.statusBadge, { backgroundColor: colors.status.pending.bg }]}>
              <Text style={[bc.statusText, { color: colors.status.pending.fg }]}>Awaiting payment</Text>
            </View>
          )}

          {/* Cancel link — only for confirmed */}
          {booking.status === 'confirmed' && (
            <TouchableOpacity
              style={bc.cancelLink}
              onPress={() => onCancel(booking)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={bc.cancelLinkText}>Cancel booking</Text>
              <ChevronRight size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.line,
    flexDirection: 'row', overflow: 'hidden',
    alignItems: 'stretch',
  },
  stripe: { width: 4 },
  dateCol: {
    width: 56, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, flexShrink: 0, gap: 1,
  },
  dateDay: { fontSize: 9,  fontWeight: '700', letterSpacing: 0.5 },
  dateNum: { fontSize: 20, fontWeight: '800' },
  dateMon: { fontSize: 9,  fontWeight: '600', letterSpacing: 0.5 },
  body:  { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  main:  { gap: 3 },
  subjectLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText:{ fontSize: 12, color: colors.muted },
  right: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusText:    { fontSize: 11, fontWeight: '700' },
  cancelLink:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cancelLinkText:{ fontSize: 12, color: colors.muted, fontWeight: '600' },
});

/* ═══════════════════════════════════════════════════════════════ */

export function BookingsPage({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient  = useQueryClient();
  const [refreshing,   setRefreshing]   = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError,  setCancelError]  = useState('');
  const [cancelBanner, setCancelBanner] = useState('');   // inline success banner

  /* ── queries ── */
  const { data: bookings = [], isLoading } = useBookings(familyId);
  const { data: gating                   } = useFamilyGating(familyId);

  /* ── cancel mutation (matches web exactly) ── */
  const { mutate: doCancel, isPending: cancelling } = useMutation({
    mutationFn: (id: string) => dataClient.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.bookings(familyId ?? '') });
      queryClient.invalidateQueries({ queryKey: qk.terms(familyId ?? '') });
      queryClient.invalidateQueries({ queryKey: qk.sessions() });
      queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
      setCancellingId(null);
      setCancelError('');
      setCancelBanner('Booking cancelled.');
    },
    onError: (e: any) => setCancelError(e?.message ?? 'Failed to cancel. Please try again.'),
  });

  /* ── derive active bookings (web: filter b.status !== 'cancelled') ── */
  const activeBookings = useMemo(
    () => bookings.filter(b => b.status !== 'cancelled'),
    [bookings]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: qk.bookings(familyId ?? '') });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
      >
        {/* ── Toolbar ── */}
        <View style={s.toolbar}>
          <View style={s.toolbarText}>
            <Text style={s.pageTitle}>Your week, sorted</Text>
            <Text style={s.pageSub}>One less thing to keep in your head.</Text>
          </View>
          <Button
            label="Book a class"
            icon={Plus}
            onPress={() => navigation.navigate('Book')}
            style={{ flexShrink: 0 }}
          />
        </View>

        {/* ── Term credit meter ── */}
        {gating?.state === 'ACTIVE_TERM' && gating.end_date && (
          <TermCreditMeter
            creditsRemaining={gating.classes_remaining ?? 0}
            creditsTotal={10}
            endDate={gating.end_date}
          />
        )}

        {/* ── Cancel-success banner (matches web unlock-banner style) ── */}
        {cancelBanner ? (
          <View style={s.successBanner}>
            <Check size={16} color={colors.status.success.fg} />
            <Text style={s.successBannerText}>{cancelBanner}</Text>
            <TouchableOpacity
              onPress={() => setCancelBanner('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 'auto' as any }}
            >
              <X size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Loading ── */}
        {isLoading && (
          <View style={{ gap: 12 }}>
            <Skeleton height={100} borderRadius={14} />
            <Skeleton height={100} borderRadius={14} />
            <Skeleton height={100} borderRadius={14} />
          </View>
        )}

        {/* ── Empty ── */}
        {!isLoading && activeBookings.length === 0 && (
          <View style={[s.emptyCard, shadow.card as object]}>
            <Text style={s.emptyText}>No upcoming bookings yet.</Text>
            <Button
              label="Book a class"
              icon={Plus}
              onPress={() => navigation.navigate('Book')}
              style={{ marginTop: 14 }}
            />
          </View>
        )}

        {/* ── Booking cards ── */}
        {!isLoading && activeBookings.map(booking => (
          <BookingCard
            key={booking.id}
            booking={booking as any}
            onCancel={(b) => { setCancellingId(b.id); setCancelError(''); }}
          />
        ))}

        {/* ── Policy card (matches web policy-card) ── */}
        <View style={[s.policyCard, shadow.card as object]}>
          <View style={s.policyIcon}>
            <Clock3 size={18} color={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.policyLabel}>Cancellation policy</Text>
            <Text style={s.policyBody}>
              Cancel 24+ hours before your session to keep your spot available for others.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════
          Cancel modal (matches web modal layout exactly)
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!cancellingId}
        transparent
        animationType="slide"
        onRequestClose={() => setCancellingId(null)}
      >
        <View style={s.backdropWrap}>
          <Pressable style={s.backdrop} onPress={() => setCancellingId(null)} />

          <View style={s.sheet}>
            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={() => setCancellingId(null)}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>

            {/* Icon (matches web modal-icon cancel — clock icon) */}
            <View style={s.modalIcon}>
              <Clock3 size={22} color={colors.orange} />
            </View>

            <Text style={s.modalTitle}>Cancel booking?</Text>
            <Text style={s.modalSub}>
              If you cancel more than 24 hours before the session, your booking will be removed.
            </Text>

            {cancelError ? (
              <Text style={s.cancelError}>{cancelError}</Text>
            ) : null}

            <Button
              label={cancelling ? 'Cancelling…' : 'Yes, cancel booking'}
              onPress={() => cancellingId && doCancel(cancellingId)}
              loading={cancelling}
              disabled={cancelling}
              fullWidth
              style={{ marginTop: 4 }}
            />
            <TouchableOpacity style={s.keepLink} onPress={() => setCancellingId(null)}>
              <Text style={s.keepLinkText}>Keep booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  /* toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12,
  },
  toolbarText: { flex: 1 },
  pageTitle:   { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: colors.muted, lineHeight: 18 },

  /* cancel-success banner */
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.status.success.bg,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#B2E8C8',
  },
  successBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.status.success.fg },

  /* empty */
  emptyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  /* policy card */
  policyCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.line,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  policyIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  policyLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  policyBody:  { fontSize: 13, color: colors.muted, lineHeight: 18 },

  /* cancel modal */
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
    backgroundColor: colors.orangeSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  modalSub:    { fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 18 },
  cancelError: { fontSize: 13, color: colors.error.fg, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  keepLink:    { alignItems: 'center', paddingVertical: 14 },
  keepLinkText:{ fontSize: 14, color: colors.muted },
});
