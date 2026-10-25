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
import { Skeleton } from '@/components/ui/Skeleton';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { usePayments } from '../hooks/usePayments';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { dataClient } from '@/lib/data/client';
import type { Payment } from '@/types/payment';

export function PaymentsPage() {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'invoice' | 'proof'>('invoice');
  const [proofFile, setProofFile] = useState<ProofFile | null>(null);
  const [proofFileName, setProofFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [priceQuote, setPriceQuote] = useState<any>(null);

  // Queries
  const { data: payments = [], isLoading: paymentsLoading } = usePayments(familyId);
  const { data: gating, isLoading: gatingLoading } = useFamilyGating(familyId);

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === 'pending'),
    [payments]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['payments', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartPurchase = async () => {
    try {
      const quote = await dataClient.getPriceQuote('term', familyId || '');
      setPriceQuote(quote);
      setShowPurchaseFlow(true);
      setPurchaseStep('invoice');
      setProofFile(null);
      setProofFileName('');
      setSubmitError(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to get price quote');
    }
  };

  const handleProofSelected = (file: ProofFile | undefined) => {
    if (!file) {
      setProofFile(null);
      setProofFileName('');
      return;
    }
    // For now, store as URI (will be uploaded)
    setProofFile(file);
    setProofFileName(file.name);
  };

  const handleSubmitProof = async () => {
    if (!proofFile || !familyId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Get family reference code
      const family = await dataClient.getFamily(familyId);
      const reference = `${family.reference_code}-TERM`;

      // Submit payment
      await dataClient.submitPayment({
        type: 'term',
        familyId,
        proof: proofFile as any,
        reference,
        amount_cents: priceQuote.total_cents,
      });

      // Invalidate and close
      await queryClient.invalidateQueries({ queryKey: ['payments', familyId] });
      setShowPurchaseFlow(false);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = paymentsLoading || gatingLoading;
  const hasActiveTerm = gating?.state === 'ACTIVE_TERM';
  const canPurchase = !hasActiveTerm;

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

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
          Payments
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}>
          Manage your payment history and purchase terms.
        </Text>

        {/* Highlight Card */}
        <View style={[styles.highlightCard, shadow.card as object]}>
          <Text style={[type.eyebrow, { color: colors.pink, marginBottom: space.xs }]}>
            Payment history
          </Text>
          <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>
            Simple, clear and all in one place.
          </Text>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
            {payments.length === 0
              ? 'No payments yet. Purchase a term to get started.'
              : `${payments.length} payment(s) on record · ${pendingPayments.length} pending verification.`}
          </Text>

          {hasActiveTerm && gating?.end_date && (
            <View style={styles.activeTermBox}>
              <Text style={[type.small, { color: colors.teal, fontWeight: '600' }]}>
                ✓ Active term · ends {format(new Date(gating.end_date), 'd MMM yyyy', { locale: enAU })}
              </Text>
            </View>
          )}

          {canPurchase && (
            <Button
              label="Purchase term"
              variant="primary"
              onPress={handleStartPurchase}
              fullWidth
            />
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={{ gap: space.lg }}>
            <Skeleton height={100} borderRadius={radius.card} />
            <Skeleton height={100} borderRadius={radius.card} />
          </View>
        )}

        {/* Empty */}
        {!isLoading && payments.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No payments on record yet.
            </Text>
          </View>
        )}

        {/* Payments List */}
        {!isLoading && payments.map((payment) => (
          <View key={payment.id} style={[styles.paymentCard, shadow.card as object]}>
            <View style={styles.paymentHeader}>
              <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                {payment.type === 'term' ? 'Term Payment' : payment.type === 'individual_class' ? 'Class Payment' : 'Assessment Payment'}
              </Text>
              <Text style={[type.small, { color: colors.muted }]}>
                {format(new Date(payment.created_at), 'd MMM yyyy', { locale: enAU })}
              </Text>
            </View>

            <View style={styles.paymentMeta}>
              <Text style={[type.small, { color: colors.muted }]}>
                Ref: {payment.reference}
              </Text>
              <Text style={[type.h3, { color: colors.ink }]}>
                {formatMoney(payment.total_cents)} AUD
              </Text>
            </View>

            <View style={styles.paymentFooter}>
              <View style={[
                styles.statusPill,
                payment.status === 'pending' && { backgroundColor: colors.status.pending.bg },
                payment.status === 'paid' && { backgroundColor: colors.status.success.bg },
                payment.status === 'rejected' && { backgroundColor: colors.status.danger.bg },
              ]}>
                <Text style={[
                  type.caption,
                  payment.status === 'pending' && { color: colors.status.pending.fg },
                  payment.status === 'paid' && { color: colors.status.success.fg },
                  payment.status === 'rejected' && { color: colors.status.danger.fg },
                ]}>
                  {payment.status === 'pending' ? 'Pending verification' : payment.status === 'paid' ? 'Approved' : 'Rejected'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Purchase Flow Modal */}
      <Modal
        visible={showPurchaseFlow}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPurchaseFlow(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            {purchaseStep === 'invoice' && priceQuote && (
              <>
                <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
                  10-week term package
                </Text>

                <View style={styles.invoiceBox}>
                  <View style={styles.invoiceLine}>
                    <Text style={[type.small, { color: colors.muted }]}>Term (10 weeks, 10 credits)</Text>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      {formatMoney(priceQuote.base_cents)}
                    </Text>
                  </View>

                  {priceQuote.registration_cents > 0 && (
                    <View style={styles.invoiceLine}>
                      <Text style={[type.small, { color: colors.muted }]}>Registration fee</Text>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {formatMoney(priceQuote.registration_cents)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.invoiceDivider} />

                  <View style={styles.invoiceLine}>
                    <Text style={[type.small, { color: colors.muted }]}>Subtotal</Text>
                    <Text style={[type.small, { color: colors.ink }]}>
                      {formatMoney(priceQuote.amount_cents)}
                    </Text>
                  </View>

                  <View style={styles.invoiceLine}>
                    <Text style={[type.small, { color: colors.muted }]}>GST (10%)</Text>
                    <Text style={[type.small, { color: colors.ink }]}>
                      {formatMoney(priceQuote.gst_cents)}
                    </Text>
                  </View>

                  <View style={styles.invoiceDivider} />

                  <View style={styles.invoiceLine}>
                    <Text style={[type.bodyStrong, { color: colors.ink }]}>Total</Text>
                    <Text style={[type.h2, { color: colors.pink }]}>
                      {formatMoney(priceQuote.total_cents)}
                    </Text>
                  </View>
                </View>

                {/* Bank Details (placeholder) */}
                <View style={styles.bankBox}>
                  <Text style={[type.eyebrow, { color: colors.mutedSoft, marginBottom: space.sm }]}>
                    Bank transfer details
                  </Text>
                  <Text style={[type.small, { color: colors.ink }]}>
                    Account: Fairybread Ltd
                  </Text>
                  <Text style={[type.small, { color: colors.ink }]}>
                    BSB: 062 000
                  </Text>
                  <Text style={[type.small, { color: colors.ink }]}>
                    Account: 1234 5678
                  </Text>
                </View>

                <View style={styles.formActions}>
                  <Button
                    label="Next: Upload proof"
                    variant="primary"
                    onPress={() => setPurchaseStep('proof')}
                    fullWidth
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setShowPurchaseFlow(false)}
                    fullWidth
                  />
                </View>
              </>
            )}

            {purchaseStep === 'proof' && (
              <>
                <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
                  Upload proof of payment
                </Text>

                <ProofPicker
                  onSelect={handleProofSelected}
                  selectedFileName={proofFileName}
                  maxSizeMB={10}
                  disabled={submitting}
                />

                {submitError && (
                  <View style={styles.errorBox}>
                    <Text style={[type.small, { color: colors.status.danger.fg }]}>
                      {submitError}
                    </Text>
                  </View>
                )}

                <View style={styles.formActions}>
                  <Button
                    label={submitting ? 'Submitting...' : 'Submit proof'}
                    variant="primary"
                    onPress={handleSubmitProof}
                    disabled={!proofFile || submitting}
                    loading={submitting}
                    fullWidth
                  />
                  <Button
                    label="Back"
                    variant="ghost"
                    onPress={() => setPurchaseStep('invoice')}
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
  highlightCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeTermBox: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  paymentMeta: {
    marginBottom: space.md,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
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
    maxHeight: '95%',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    paddingTop: space.xl,
  },
  invoiceBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  invoiceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.md,
  },
  bankBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
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
