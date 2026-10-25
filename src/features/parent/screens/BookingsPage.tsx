import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextStyle,
} from 'react-native';
import { format } from 'date-fns';
import { enAU } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBookings } from '../hooks/useBookings';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { dataClient } from '@/lib/data/client';
import type { ClassBooking } from '@/types/booking';

export function BookingsPage() {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ClassBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<{ credit_restored: boolean; within_window: boolean } | null>(null);

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(familyId);
  const { data: gating, isLoading: gatingLoading } = useFamilyGating(familyId);

  // Filter upcoming bookings
  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed').sort((a, b) => {
      const aTime = new Date(a.session?.starts_at || 0).getTime();
      const bTime = new Date(b.session?.starts_at || 0).getTime();
      return aTime - bTime;
    }),
    [bookings]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['bookings', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelBooking = (booking: ClassBooking) => {
    setSelectedBooking(booking);
    setShowCancelSheet(true);
    setCancelError(null);
    setCancelResult(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const result = await dataClient.cancelBooking(selectedBooking.id, { restoreCredit: true });
      setCancelResult(result);

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['bookings', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });

      // Auto-close after 2s
      setTimeout(() => {
        setShowCancelSheet(false);
      }, 2000);
    } catch (e: any) {
      setCancelError(e?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const isLoading = bookingsLoading || gatingLoading;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm } as TextStyle]}>
          My bookings
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}>
          Your class bookings this term.
        </Text>

        {/* Term Credit Meter */}
        {gating && gating.state === 'ACTIVE_TERM' && (
          <TermCreditMeter
            creditsRemaining={gating.classes_remaining}
            creditsTotal={10}
            endDate={gating.end_date}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <View style={{ gap: space.lg }}>
            <Skeleton height={120} borderRadius={radius.card} />
            <Skeleton height={120} borderRadius={radius.card} />
          </View>
        )}

        {/* Empty State */}
        {!isLoading && upcomingBookings.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[type.h3, { color: colors.muted, textAlign: 'center' }]}>
              No upcoming bookings yet.
            </Text>
            <Button
              label="Book a class"
              variant="primary"
              onPress={() => {
                // Navigate to Book class
              }}
              style={{ marginTop: space.lg }}
            />
          </View>
        )}

        {/* Bookings List */}
        {!isLoading && upcomingBookings.map((booking: any) => (
          <View key={booking.id} style={[styles.bookingCard, shadow.card as object]}>
            {/* Left border */}
            <View style={[styles.leftBorder, { backgroundColor: colors.pink }]} />

            <View style={styles.bookingContent}>
              <View style={styles.bookingHeader}>
                <Text style={[type.h3, { color: colors.ink }]}>
                  {booking.session?.subject || 'Class'}
                </Text>
                <Text style={[type.eyebrow, { color: colors.mutedSoft }]}>
                  with {booking.session?.teacher_name || 'TBD'}
                </Text>
              </View>

              <View style={styles.bookingMeta}>
                <Text style={[type.small, { color: colors.muted }]}>
                  {booking.session?.starts_at ? format(new Date(booking.session.starts_at), 'EEEE d MMMM · h:mm a', {
                    locale: enAU,
                  }) : 'TBD'}
                </Text>
                <Text style={[type.small, { color: colors.muted }]}>
                  Child: {booking.child?.name}
                </Text>
              </View>

              <View style={styles.bookingFooter}>
                <View style={styles.statusPill}>
                  <Text style={[type.caption, { color: colors.status.success.fg }]}>
                    ✓ Confirmed
                  </Text>
                </View>

                <Button
                  label="Cancel booking"
                  variant="ghost"
                  onPress={() => handleCancelBooking(booking)}
                  style={{ padding: 0 }}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Cancellation Policy */}
        <View style={[styles.policyBox, shadow.card as object]}>
          <Text style={[type.eyebrow, { color: colors.pink, marginBottom: space.sm }]}>
            Cancellation policy
          </Text>
          <Text style={[type.small, { color: colors.muted }]}>
            Cancel 24+ hours before your session to keep your credit available for others.
          </Text>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Sheet */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
              Cancel booking?
            </Text>

            {cancelResult ? (
              <>
                <View style={[styles.resultBox, cancelResult.credit_restored ? styles.successResult : styles.warningResult]}>
                  <Text style={[type.small, { color: colors.ink, fontWeight: '600', marginBottom: space.sm }]}>
                    Booking cancelled
                  </Text>
                  <Text style={[type.body, { color: colors.ink }]}>
                    {cancelResult.credit_restored
                      ? 'Your credit has been restored.'
                      : 'Your credit was not restored (booking was within 24 hours).'}
                  </Text>
                </View>

                <Button
                  label="Done"
                  variant="primary"
                  onPress={() => setShowCancelSheet(false)}
                  fullWidth
                />
              </>
            ) : (
              <>
                <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
                  Cancel 24+ hours before the session to restore your credit.
                </Text>

                {cancelError && (
                  <View style={styles.errorBox}>
                    <Text style={[type.small, { color: colors.status.danger.fg }]}>
                      {cancelError}
                    </Text>
                  </View>
                )}

                <View style={styles.formActions}>
                  <Button
                    label={cancelling ? 'Cancelling...' : 'Yes, cancel booking'}
                    variant="primary"
                    onPress={handleConfirmCancel}
                    loading={cancelling}
                    fullWidth
                  />
                  <Button
                    label="Keep booking"
                    variant="ghost"
                    onPress={() => setShowCancelSheet(false)}
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
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space.md,
    flexDirection: 'row',
  },
  leftBorder: {
    width: 4,
  },
  bookingContent: {
    flex: 1,
    padding: space.lg,
  },
  bookingHeader: {
    marginBottom: space.sm,
  },
  bookingMeta: {
    gap: space.xs,
    marginBottom: space.md,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.status.success.bg,
    borderRadius: radius.pill,
  },
  policyBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
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
  resultBox: {
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  successResult: {
    backgroundColor: colors.status.success.bg,
  },
  warningResult: {
    backgroundColor: colors.status.pending.bg,
  },
  errorBox: {
    backgroundColor: colors.status.danger.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  formActions: {
    gap: space.md,
    marginTop: space.lg,
  },
});
