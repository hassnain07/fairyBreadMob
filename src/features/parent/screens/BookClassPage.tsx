import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextStyle,
} from 'react-native';
import { format, addDays, startOfToday } from 'date-fns';
import { enAU } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Users, CheckCircle } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { ChildSwitcher } from '@/components/domain/ChildSwitcher';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { UnlockBanner } from '@/components/domain/UnlockBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useChildren } from '../hooks/useChildren';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { useSessions } from '../hooks/useSessions';
import { useBookings } from '../hooks/useBookings';
import { dataClient } from '@/lib/data/client';
import type { Child } from '@/types/family';
import type { ClassSession } from '@/types/teacher';

export function BookClassPage() {
  const { user, familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Queries
  const { data: children = [], isLoading: childrenLoading } = useChildren(familyId);
  const { data: gating, isLoading: gatingLoading } = useFamilyGating(familyId);
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: bookings = [] } = useBookings(familyId);

  // Get enrolled children only
  const enrolledChildren = useMemo(
    () => children,
    [children]
  );

  // Set first enrolled child as default
  React.useEffect(() => {
    if (enrolledChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(enrolledChildren[0].id);
    }
  }, [enrolledChildren, selectedChildId]);

  const selectedChild = useMemo(
    () => enrolledChildren.find((c) => c.id === selectedChildId),
    [enrolledChildren, selectedChildId]
  );

  const bookedSessionIds = useMemo(
    () => new Set(bookings.filter((b) => b.status === 'confirmed').map((b) => b.session?.id)),
    [bookings]
  );

  const handleSelectChild = (child: Child) => {
    setSelectedChildId(child.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['bookings', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectSession = (session: ClassSession) => {
    setSelectedSession(session);
    setShowConfirmSheet(true);
    setConfirmError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSession || !selectedChild) return;

    setConfirming(true);
    setConfirmError(null);

    try {
      await dataClient.bookClassSession(selectedChild.id, selectedSession.id);

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['bookings', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });

      setBookingSuccess(true);
      setShowConfirmSheet(false);

      // Auto-hide success after 2s
      setTimeout(() => setBookingSuccess(false), 2000);
    } catch (e: any) {
      const msg = e?.message || 'Failed to book class. Please try again.';
      setConfirmError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const isLoading = childrenLoading || gatingLoading || sessionsLoading;

  // No enrolled children
  if (!isLoading && enrolledChildren.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg } as TextStyle]}>
          No enrolled children
        </Text>
        <Text style={[type.body, { color: colors.muted }]}>
          All children must be enrolled before booking classes. Please complete enrolment first.
        </Text>
      </ScrollView>
    );
  }

  // No active term
  if (!isLoading && gating?.state !== 'ACTIVE_TERM') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <UnlockBanner
          type={gating?.state === 'NO_TERM_EVER' ? 'no_term' : 'expired'}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm } as TextStyle]}>
          Book a class
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}>
          Choose a session and confirm your booking.
        </Text>

        {/* Child Switcher */}
        {enrolledChildren.length > 1 && (
          <ChildSwitcher
            children={enrolledChildren}
            selectedChildId={selectedChildId || undefined}
            onSelectChild={handleSelectChild}
          />
        )}

        {/* Term Credit Meter */}
        {gating && gating.state === 'ACTIVE_TERM' && gating.classes_remaining !== undefined && (
          <TermCreditMeter
            creditsRemaining={gating.classes_remaining}
            creditsTotal={10}
            endDate={gating.end_date}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={{ gap: space.lg }}>
            <Skeleton height={100} borderRadius={radius.card} />
            <Skeleton height={100} borderRadius={radius.card} />
            <Skeleton height={100} borderRadius={radius.card} />
          </View>
        )}

        {/* Sessions List */}
        {!isLoading && sessions.length === 0 && (
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.xl }]}>
            No upcoming sessions available right now.
          </Text>
        )}

        {!isLoading && sessions.map((session: ClassSession) => {
          const isBooked = bookedSessionIds.has(session.id);
          const isFull = session.booked_count >= session.capacity;
          const canBook = !isBooked && !isFull && (gating?.classes_remaining ?? 0) > 0;

          const startTime = new Date(session.starts_at);
          const timeStr = format(startTime, 'h:mm a', { locale: enAU });
          const dayStr = format(startTime, 'EEEE', { locale: enAU });
          const dateStr = format(startTime, 'd MMM', { locale: enAU });

          return (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, !canBook && styles.sessionCardDisabled]}
              onPress={() => canBook && handleSelectSession(session)}
              disabled={!canBook}
            >
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.eyebrow, { color: colors.pink, marginBottom: space.xs }]}>
                    {session.subject}
                  </Text>
                  <Text style={[type.h3, { color: colors.ink }]}>
                    {dayStr} {dateStr} · {timeStr}
                  </Text>
                </View>
                {isBooked && (
                  <View style={styles.bookedBadge}>
                    <CheckCircle size={20} color={colors.green} />
                  </View>
                )}
              </View>

              <View style={styles.sessionMeta}>
                <Text style={[type.small, { color: colors.muted }]}>
                  with {session.teacher_name}
                </Text>
              </View>

              <View style={styles.sessionFooter}>
                {isFull ? (
                  <View style={styles.fullPill}>
                    <Text style={[type.caption, { color: colors.status.danger.fg }]}>
                      Class full
                    </Text>
                  </View>
                ) : (
                  <View style={styles.spacePill}>
                    <Users size={14} color={colors.muted} />
                    <Text style={[type.caption, { color: colors.muted }]}>
                      {session.capacity - session.booked_count} space
                      {session.capacity - session.booked_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {isBooked ? (
                  <Text style={[type.small, { color: colors.green, fontWeight: '600' }]}>
                    ✓ Booked
                  </Text>
                ) : !canBook ? (
                  <Text style={[type.small, { color: colors.muted }]}>
                    {isFull ? 'Full' : 'No credits'}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Confirm Booking Sheet */}
      <Modal
        visible={showConfirmSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
              Confirm booking
            </Text>

            {selectedSession && selectedChild && (
              <>
                <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
                  This will use one session from your active term.
                </Text>

                {/* Review rows */}
                <View style={styles.reviewBox}>
                  <View style={styles.reviewRow}>
                    <Text style={[type.caption, { color: colors.mutedSoft }]}>
                      Child
                    </Text>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      {selectedChild.givenName}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={[type.caption, { color: colors.mutedSoft }]}>
                      Subject
                    </Text>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      {selectedSession.subject}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={[type.caption, { color: colors.mutedSoft }]}>
                      Date & Time
                    </Text>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      {format(new Date(selectedSession.starts_at), 'EEEE d MMMM · h:mm a', {
                        locale: enAU,
                      })}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={[type.caption, { color: colors.mutedSoft }]}>
                      Tutor
                    </Text>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      {selectedSession.teacher_name}
                    </Text>
                  </View>
                </View>

                {/* Error */}
                {confirmError && (
                  <View style={styles.errorBox}>
                    <Text style={[type.small, { color: colors.status.danger.fg }]}>
                      {confirmError}
                    </Text>
                  </View>
                )}

                {/* Success */}
                {bookingSuccess && (
                  <View style={styles.successBox}>
                    <Text style={[type.small, { color: colors.status.success.fg }]}>
                      ✓ Booking confirmed!
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.formActions}>
                  <Button
                    label={confirming ? 'Confirming...' : 'Yes, confirm booking'}
                    variant="primary"
                    onPress={handleConfirmBooking}
                    loading={confirming}
                    fullWidth
                  />
                  <Button
                    label="Not now"
                    variant="ghost"
                    onPress={() => setShowConfirmSheet(false)}
                    fullWidth
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    gap: space.lg,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space.md,
  },
  sessionCardDisabled: {
    opacity: 0.6,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.md,
  },
  bookedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionMeta: {
    marginBottom: space.md,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  fullPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.status.danger.bg,
    borderRadius: radius.pill,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '90%',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    paddingTop: space.xl,
  },
  reviewBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  errorBox: {
    backgroundColor: colors.status.danger.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  successBox: {
    backgroundColor: colors.status.success.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  formActions: {
    gap: space.md,
    marginTop: space.lg,
  },
});
