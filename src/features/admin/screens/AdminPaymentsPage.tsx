import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => dataClient.getAllPayments?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);

  const verifyPaymentMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      if (!selectedPaymentId) throw new Error('No payment selected');
      const note = action === 'reject' ? rejectNote : undefined;
      await dataClient.verifyPayment?.(selectedPaymentId, action, note);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Payment updated');
      setSelectedPaymentId(null);
      setShowRejectModal(false);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update payment');
    },
  });

  const pending = payments.filter(p => p.status === 'pending');
  const approved = payments.filter(p => p.status === 'approved');
  const rejected = payments.filter(p => p.status === 'rejected');

  const renderPayment = (payment: any) => (
    <TouchableOpacity
      key={payment.id}
      style={[styles.card, shadow.card as object]}
      onPress={() => setSelectedPaymentId(payment.id)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.h3, { color: colors.ink }]}>
            {payment.family_name}
          </Text>
          <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
            {payment.type === 'term' ? 'Term Payment' : 'Class Payment'}
          </Text>
          <Text style={[type.small, { color: colors.ink, fontWeight: '600', marginTop: space.xs }]}>
            ${payment.amount_cents ? (payment.amount_cents / 100).toFixed(2) : '0.00'}
          </Text>
          <Text style={[type.caption, { color: colors.muted, marginTop: space.xs }]}>
            {new Date(payment.created_at).toLocaleDateString('en-AU')}
          </Text>
        </View>
        <View style={[
          styles.statusPill,
          { backgroundColor: payment.status === 'pending' ? '#FFF8DF' : payment.status === 'approved' ? '#EDF9EF' : '#FFF0E9' }
        ]}>
          <Text style={[type.pill, { color: payment.status === 'pending' ? '#AD8917' : payment.status === 'approved' ? '#3C9E68' : '#D86B35' }]}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (selectedPaymentId && selectedPayment) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
          <TouchableOpacity onPress={() => setSelectedPaymentId(null)} style={{ marginBottom: space.lg }}>
            <Text style={[type.h3, { color: colors.pink }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>
            Payment Details
          </Text>
          <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
            {selectedPayment.family_name}
          </Text>

          {/* Payment Info */}
          <View style={[styles.infoCard, shadow.card as object, { marginBottom: space.xl }]}>
            <View style={styles.infoRow}>
              <Text style={[type.small, { color: colors.muted }]}>Amount</Text>
              <Text style={[type.h3, { color: colors.pink }]}>
                ${(selectedPayment.amount_cents / 100).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginTop: space.lg, paddingTopColor: colors.line, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.lg }]}>
              <Text style={[type.small, { color: colors.muted }]}>Type</Text>
              <Text style={[type.h3, { color: colors.ink }]}>
                {selectedPayment.type === 'term' ? 'Term Payment' : 'Class Payment'}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginTop: space.lg }]}>
              <Text style={[type.small, { color: colors.muted }]}>Status</Text>
              <Text style={[type.h3, { color: colors.ink }]}>
                {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginTop: space.lg }]}>
              <Text style={[type.small, { color: colors.muted }]}>Date</Text>
              <Text style={[type.small, { color: colors.ink }]}>
                {new Date(selectedPayment.created_at).toLocaleDateString('en-AU')}
              </Text>
            </View>
          </View>

          {/* Proof Viewer */}
          {selectedPayment.proof_url && (
            <View style={[styles.proofBox, shadow.card as object, { marginBottom: space.xl }]}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
                Proof of Payment
              </Text>
              <View style={styles.proofPlaceholder}>
                <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
                  [Proof Image/PDF]\n{selectedPayment.proof_url.substring(0, 50)}...
                </Text>
              </View>
              <Text style={[type.caption, { color: colors.muted, marginTop: space.md }]}>
                📎 Proof uploaded by parent
              </Text>
            </View>
          )}

          {/* Admin Notes */}
          {selectedPayment.admin_notes && (
            <View style={[styles.notesBox, shadow.card as object, { marginBottom: space.xl }]}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
                Admin Notes
              </Text>
              <Text style={[type.small, { color: colors.ink }]}>
                {selectedPayment.admin_notes}
              </Text>
            </View>
          )}

          {selectedPayment.status === 'pending' && (
            <View style={[styles.actionBox, shadow.card as object]}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Action Required
              </Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
                Review the proof and approve or reject this payment.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setSelectedPaymentId(null)}
          />
          {selectedPayment.status === 'pending' && (
            <>
              <Button
                label="Reject"
                onPress={() => setShowRejectModal(true)}
                disabled={verifyPaymentMutation.isPending}
                style={{ flex: 1 }}
              />
              <Button
                label="Approve"
                onPress={() => verifyPaymentMutation.mutate('approve')}
                disabled={verifyPaymentMutation.isPending}
                style={{ flex: 1 }}
              />
            </>
          )}
        </View>

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, shadow.sheet as object]}>
              <View style={styles.modalHeader}>
                <Text style={[type.h2, { color: colors.ink, flex: 1 }]}>Reject Payment</Text>
                <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                  <X size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
                Provide a reason for rejection. The parent will see this message.
              </Text>

              <TextInput
                style={[styles.textarea]}
                placeholder="Reason for rejection..."
                placeholderTextColor={colors.muted}
                value={rejectNote}
                onChangeText={setRejectNote}
                multiline
                numberOfLines={4}
              />

              <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setShowRejectModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Reject"
                  onPress={() => {
                    if (!rejectNote.trim()) {
                      Alert.alert('Note required', 'Please provide a reason for rejection');
                      return;
                    }
                    verifyPaymentMutation.mutate('reject');
                  }}
                  disabled={verifyPaymentMutation.isPending || !rejectNote.trim()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      scrollEventThrottle={16}
    >
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Payments
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Verify and manage family payments.
      </Text>

      {isLoading ? (
        <View style={{ gap: space.lg }}>
          <Skeleton height={100} borderRadius={radius.card} />
          <Skeleton height={100} borderRadius={radius.card} />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            No payments yet.
          </Text>
        </View>
      ) : (
        <>
          {pending.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Pending ({pending.length})
              </Text>
              <View style={{ gap: space.md }}>
                {pending.map(renderPayment)}
              </View>
            </View>
          )}

          {approved.length > 0 && (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Approved ({approved.length})
              </Text>
              <View style={{ gap: space.md }}>
                {approved.map(renderPayment)}
              </View>
            </View>
          )}

          {rejected.length > 0 && (
            <View>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                Rejected ({rejected.length})
              </Text>
              <View style={{ gap: space.md }}>
                {rejected.map(renderPayment)}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proofBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  proofPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space.lg,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  notesBox: {
    backgroundColor: '#FFF0E9',
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: '#FFD2B9',
  },
  actionBox: {
    backgroundColor: '#FFF8DF',
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: '#F5E6C1',
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  textarea: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
