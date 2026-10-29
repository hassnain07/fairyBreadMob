import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { enAU } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Check,
  Clock3,
  FileText,
  Plus,
  X,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { usePayments } from '../hooks/usePayments';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { dataClient } from '@/lib/data/client';
import type { Payment, PaymentIntent } from '@/types/payment';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function paymentLabel(p: Payment): string {
  if (p.type === 'individual_class') {
    return `${p.details.subject ?? 'Individual class'}${p.details.child_name ? ` — ${p.details.child_name}` : ''}`;
  }
  if (p.type === 'assessment') {
    return `Assessment${p.details.child_name ? ` — ${p.details.child_name}` : ''}`;
  }
  return `Term payment${p.term_label ? ` · ${p.term_label}` : ''}`;
}

function paymentAccent(p: Payment) {
  if (p.type === 'individual_class') return { color: colors.teal, bg: colors.tealSoft };
  if (p.type === 'assessment') return { color: colors.yellow, bg: colors.yellowSoft };
  return { color: colors.pink, bg: colors.pinkSoft };
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

type StatusBadgeProps = { status: Payment['status'] };

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    paid:     { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Verified' },
    pending:  { bg: colors.status.pending.bg, fg: colors.status.pending.fg, label: 'Pending' },
    failed:   { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  label: 'Failed' },
    rejected: { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  label: 'Rejected' },
  };
  const s = map[status] ?? map.failed;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      {status === 'paid'    && <Check    size={10} color={s.fg} style={styles.badgeIcon} />}
      {status === 'pending' && <Clock3   size={10} color={s.fg} style={styles.badgeIcon} />}
      <Text style={[type.caption, { color: s.fg, fontWeight: '600' }]}>{s.label}</Text>
    </View>
  );
}

// ─── PaymentCard ─────────────────────────────────────────────────────────────

type PaymentCardProps = { payment: Payment; onPress: (p: Payment) => void };

function PaymentCard({ payment, onPress }: PaymentCardProps) {
  const { color, bg } = paymentAccent(payment);
  const date = format(new Date(payment.created_at), 'd MMM yyyy', { locale: enAU });

  return (
    <TouchableOpacity
      style={[styles.card, shadow.card]}
      onPress={() => onPress(payment)}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.cardIcon, { backgroundColor: bg }]}>
        <CircleDollarSign size={20} color={color} />
      </View>

      {/* Label + ref + date */}
      <View style={styles.cardBody}>
        <Text style={[type.small, styles.cardTitle]} numberOfLines={1}>
          {paymentLabel(payment)}
        </Text>
        <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
          {payment.reference} · {date}
        </Text>
        {payment.review_note && payment.status === 'rejected' && (
          <Text style={[type.caption, { color: colors.orange, marginTop: 2 }]}>
            Rejected: {payment.review_note}
          </Text>
        )}
      </View>

      {/* Amount + status */}
      <View style={styles.cardRight}>
        <Text style={[type.bodyStrong, { color: colors.ink, textAlign: 'right' }]}>
          {formatMoney(payment.total_cents)}
        </Text>
        <Text style={[type.caption, { color: colors.muted, textAlign: 'right', marginBottom: 4 }]}>
          AUD
        </Text>
        <StatusBadge status={payment.status} />
      </View>
    </TouchableOpacity>
  );
}

// ─── PaymentDetailSheet ───────────────────────────────────────────────────────

type DetailSheetProps = { payment: Payment; onClose: () => void };

function PaymentDetailSheet({ payment, onClose }: DetailSheetProps) {
  const isClass      = payment.type === 'individual_class';
  const isAssessment = payment.type === 'assessment';
  const date = format(new Date(payment.created_at), 'd MMMM yyyy', { locale: enAU });

  const rows: { label: string; value: React.ReactNode }[] = [];

  if ((isClass || isAssessment) && payment.details.child_name) {
    rows.push({ label: 'Child', value: payment.details.child_name });
  }
  if (isClass) {
    if (payment.details.subject) rows.push({ label: 'Subject',  value: payment.details.subject });
    if (payment.details.day)     rows.push({ label: 'Day',      value: payment.details.day });
    if (payment.details.time)    rows.push({ label: 'Time',     value: payment.details.time });
    if (payment.details.tutor)   rows.push({ label: 'Tutor',    value: payment.details.tutor });
  }
  if (!isClass && !isAssessment && payment.term_label) {
    rows.push({ label: 'Term', value: payment.term_label });
  }
  rows.push({ label: 'Reference',     value: payment.reference });
  rows.push({ label: 'Date submitted', value: date });
  rows.push({ label: 'Amount',        value: formatMoney(payment.amount_cents) });
  rows.push({ label: 'GST',           value: formatMoney(payment.gst_cents) });
  rows.push({ label: 'Total',         value: `${formatMoney(payment.total_cents)} AUD` });

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, shadow.sheet]} onPress={e => e.stopPropagation()}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Close button */}
        <TouchableOpacity style={styles.sheetClose} onPress={onClose} hitSlop={12}>
          <X size={18} color={colors.muted} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Icon + heading */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIconWrap}>
              <CircleDollarSign size={24} color={colors.pink} />
            </View>
            <Text style={[type.h2, { color: colors.ink, textAlign: 'center', marginTop: space.md }]}>
              {isClass ? 'Individual class payment' : isAssessment ? 'Assessment payment' : 'Term payment'}
            </Text>
          </View>

          {/* Detail rows */}
          <View style={styles.detailTable}>
            {rows.map(({ label, value }) => (
              <View key={label} style={styles.detailRow}>
                <Text style={[type.small, { color: colors.muted, flex: 1 }]}>{label}</Text>
                <Text style={[type.small, { color: colors.ink, fontWeight: '600', textAlign: 'right', flex: 1.5 }]}>
                  {typeof value === 'string' ? value : value}
                </Text>
              </View>
            ))}
            {/* Status row */}
            <View style={styles.detailRow}>
              <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Status</Text>
              <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <StatusBadge status={payment.status} />
              </View>
            </View>
            {/* Receipt row */}
            {payment.proof_filename && (
              <View style={styles.detailRow}>
                <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Receipt</Text>
                <View style={[styles.receiptRow, { flex: 1.5 }]}>
                  <FileText size={13} color={colors.teal} />
                  <Text style={[type.caption, { color: colors.teal, marginLeft: 4 }]} numberOfLines={1}>
                    {payment.proof_filename}
                  </Text>
                </View>
              </View>
            )}
            {/* Rejection note */}
            {payment.review_note && payment.status === 'rejected' && (
              <View style={styles.detailRow}>
                <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Rejection note</Text>
                <Text style={[type.small, { color: colors.orange, fontWeight: '600', flex: 1.5, textAlign: 'right' }]}>
                  {payment.review_note}
                </Text>
              </View>
            )}
          </View>

          {/* Pending notice */}
          {payment.status === 'pending' && (
            <View style={styles.pendingNote}>
              <Clock3 size={15} color={colors.status.pending.fg} />
              <Text style={[type.small, { color: colors.status.pending.fg, flex: 1, marginLeft: space.sm }]}>
                Your payment is being reviewed. We'll notify you once it's verified — usually within 1–2 business days.
              </Text>
            </View>
          )}

          <View style={{ height: space.xl }} />
          <Button label="Close" variant="soft" onPress={onClose} fullWidth />
          <View style={{ height: space.lg }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ─── PurchaseSheet ────────────────────────────────────────────────────────────

type PurchaseSheetProps = {
  intent: PaymentIntent;
  onDone: () => void;
  onCancel: () => void;
};

function PurchaseSheet({ intent, onDone, onCancel }: PurchaseSheetProps) {
  const { familyId } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<'invoice' | 'proof'>('invoice');
  const [proofFile, setProofFile] = useState<ProofFile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Price quote
  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', intent.type, familyId],
    queryFn:  () => dataClient.getPriceQuote(intent.type, familyId!),
    enabled:  !!familyId,
    staleTime: 60_000,
  });

  // Settings (bank details)
  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => dataClient.getSettings(),
    staleTime: 5 * 60_000,
  });

  // Family reference code
  const { data: family } = useQuery({
    queryKey: ['family', familyId],
    queryFn:  () => dataClient.getFamily(familyId!),
    enabled:  !!familyId,
    staleTime: 5 * 60_000,
  });

  const bank = (settings as any)?.public_info?.bank ?? {};
  const refCode = family?.reference_code ?? familyId ?? '';
  const suffix  = intent.type === 'term' ? 'TERM' : intent.type === 'individual_class' ? 'CLASS' : 'ASSESS';
  const reference = `${refCode}-${suffix}`;

  const typeLabel =
    intent.type === 'term'             ? 'Term payment'     :
    intent.type === 'individual_class' ? 'Individual class' : 'Assessment';

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: async () => {
      if (!proofFile) throw new Error('Please attach your proof of payment.');
      const blob = await (await fetch(proofFile.uri)).blob();
      const file = new File([blob], proofFile.name, { type: blob.type || 'application/octet-stream' });
      return dataClient.submitPayment({ ...intent, proof: file } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', familyId] });
      qc.invalidateQueries({ queryKey: ['family-gating', familyId] });
      onDone();
    },
    onError: (e: any) => setSubmitError(e?.message ?? 'Failed to submit payment'),
  });

  return (
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Pressable style={[styles.sheet, shadow.sheet]} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />

        {/* Header row */}
        <View style={styles.purchaseHeader}>
          <View>
            <Text style={[type.eyebrow, { color: colors.pink }]}>{typeLabel}</Text>
            <Text style={[type.h2, { color: colors.ink, marginTop: 2 }]}>
              {intent.type === 'term' ? '10-week term package' : 'Class payment'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancel} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── Step 1: Invoice ─────────────────────────────────────── */}
          {step === 'invoice' && (
            <>
              {quoteLoading ? (
                <View style={{ gap: space.md }}>
                  <Skeleton height={20} borderRadius={radius.md} />
                  <Skeleton height={20} borderRadius={radius.md} />
                  <Skeleton height={20} borderRadius={radius.md} />
                </View>
              ) : quote ? (
                <>
                  {/* Invoice lines */}
                  <View style={styles.invoiceBox}>
                    {intent.type === 'term' ? (
                      <>
                        <View style={styles.invoiceLine}>
                          <Text style={[type.small, { color: colors.muted }]}>10-week term</Text>
                          <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                            {formatMoney(quote.base_cents)}
                          </Text>
                        </View>
                        {quote.registration_cents > 0 && (
                          <View style={styles.invoiceLine}>
                            <Text style={[type.small, { color: colors.muted }]}>Registration fee</Text>
                            <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                              {formatMoney(quote.registration_cents)}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.invoiceLine}>
                        <Text style={[type.small, { color: colors.muted }]}>Class fee</Text>
                        <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                          {formatMoney(quote.amount_cents)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.invoiceDivider} />

                    <View style={styles.invoiceLine}>
                      <Text style={[type.small, { color: colors.muted }]}>Subtotal</Text>
                      <Text style={[type.small, { color: colors.ink }]}>{formatMoney(quote.amount_cents)}</Text>
                    </View>
                    <View style={styles.invoiceLine}>
                      <Text style={[type.small, { color: colors.muted }]}>GST (10%)</Text>
                      <Text style={[type.small, { color: colors.ink }]}>{formatMoney(quote.gst_cents)}</Text>
                    </View>

                    <View style={styles.invoiceDivider} />

                    <View style={styles.invoiceLine}>
                      <Text style={[type.bodyStrong, { color: colors.ink }]}>Total due</Text>
                      <Text style={[type.h2, { color: colors.pink }]}>
                        {formatMoney(quote.total_cents)} AUD
                      </Text>
                    </View>
                  </View>

                  {/* Bank details */}
                  <View style={styles.bankBox}>
                    <View style={styles.bankHead}>
                      <CircleDollarSign size={16} color={colors.teal} />
                      <Text style={[type.eyebrow, { color: colors.teal, marginLeft: space.sm }]}>
                        Bank transfer details
                      </Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Account name</Text>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {bank.account_name ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={[type.small, { color: colors.muted, flex: 1 }]}>BSB</Text>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {bank.bsb ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Account number</Text>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {bank.account ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={[type.small, { color: colors.muted, flex: 1 }]}>Reference</Text>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {reference}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sheetActions}>
                    <Button
                      label="I've made this payment"
                      variant="primary"
                      icon={Check}
                      onPress={() => setStep('proof')}
                      fullWidth
                    />
                    <Button label="Cancel" variant="ghost" onPress={onCancel} fullWidth />
                  </View>
                </>
              ) : null}
            </>
          )}

          {/* ── Step 2: Proof upload ─────────────────────────────────── */}
          {step === 'proof' && (
            <>
              <Text style={[type.eyebrow, { color: colors.muted, marginBottom: space.xs }]}>
                Upload proof of payment
              </Text>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
                Share your receipt
              </Text>

              <ProofPicker
                onSelect={(f) => setProofFile(f ?? null)}
                selectedFile={proofFile ?? undefined}
                prompt="Please upload your payment receipt."
                helper="Upload a screenshot or PDF of your bank transfer confirmation."
                maxSizeMB={10}
                disabled={submitting}
              />

              {submitError && (
                <View style={styles.errorBox}>
                  <Text style={[type.small, { color: colors.error.fg }]}>{submitError}</Text>
                </View>
              )}

              <View style={styles.sheetActions}>
                <Button
                  label={submitting ? 'Submitting…' : 'Submit proof'}
                  variant="primary"
                  icon={ArrowRight}
                  onPress={() => submit()}
                  disabled={!proofFile || submitting}
                  loading={submitting}
                  fullWidth
                />
                <Button
                  label="Back"
                  variant="ghost"
                  onPress={() => { setSubmitError(null); setStep('invoice'); }}
                  fullWidth
                />
              </View>
            </>
          )}

          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function PaymentsPage() {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing]         = useState(false);
  const [activeIntent, setActiveIntent]     = useState<PaymentIntent | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  const { data: payments = [], isLoading: paymentsLoading } = usePayments(familyId);
  const { data: gating,         isLoading: gatingLoading }  = useFamilyGating(familyId);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['payments',      familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [payments]
  );
  const pendingPayments = useMemo(() => sorted.filter(p => p.status === 'pending'), [sorted]);
  const historyPayments = useMemo(() => sorted.filter(p => p.status !== 'pending'), [sorted]);
  const paidTotal       = useMemo(
    () => payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total_cents, 0),
    [payments]
  );

  const hasActiveTerm = gating?.state === 'ACTIVE_TERM';
  const isExpired     = gating?.state === 'TERM_EXPIRED';
  const canPurchase   = gating?.state !== 'ACTIVE_TERM';

  const isLoading = paymentsLoading || gatingLoading;

  const handleStartPurchase = () => {
    if (!familyId) return;
    setActiveIntent({ type: 'term', familyId } as any);
  };

  const handleFlowDone = () => setActiveIntent(null);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Header highlight ──────────────────────────────────── */}
        <View style={[styles.highlightCard, shadow.card]}>
          <View style={styles.highlightTop}>
            {/* Left: label + heading + summary */}
            <View style={styles.highlightLeft}>
              <Text style={[type.eyebrow, { color: colors.pink, marginBottom: space.xs }]}>
                Payment history
              </Text>
              <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>
                Simple, clear and{'\n'}all in one place.
              </Text>
              <Text style={[type.small, { color: colors.muted }]}>
                {payments.length === 0
                  ? 'No payments yet. Purchase a term to get started.'
                  : `${payments.length} payment${payments.length !== 1 ? 's' : ''} on record${pendingPayments.length > 0 ? ` · ${pendingPayments.length} pending verification` : ''}.`}
              </Text>
            </View>

            {/* Right: total paid pill */}
            {payments.length > 0 && (
              <View style={styles.totalPill}>
                <Text style={[type.caption, { color: colors.muted, letterSpacing: 0.5 }]}>TOTAL PAID</Text>
                <Text style={[type.h2, { color: colors.ink, marginTop: 2 }]}>{formatMoney(paidTotal)}</Text>
                <Text style={[type.caption, { color: colors.muted }]}>AUD · verified</Text>
              </View>
            )}
          </View>

          {/* Active term strip */}
          {hasActiveTerm && gating?.end_date && (
            <View style={styles.activeTermStrip}>
              <Check size={14} color={colors.teal} />
              <Text style={[type.small, { color: colors.teal, fontWeight: '600', marginLeft: space.sm, flex: 1 }]}>
                Active term · ends {format(new Date(gating.end_date), 'd MMM yyyy', { locale: enAU })}
              </Text>
            </View>
          )}

          {/* Purchase button */}
          {canPurchase && (
            <View style={{ marginTop: space.md }}>
              <Button
                label={isExpired ? 'Renew term' : 'Purchase term'}
                variant="primary"
                icon={Plus}
                onPress={handleStartPurchase}
                fullWidth
              />
            </View>
          )}
        </View>

        {/* ── Loading skeletons ─────────────────────────────────── */}
        {isLoading && (
          <View style={{ gap: space.md }}>
            <Skeleton height={88} borderRadius={radius.card} />
            <Skeleton height={88} borderRadius={radius.card} />
            <Skeleton height={88} borderRadius={radius.card} />
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────── */}
        {!isLoading && payments.length === 0 && (
          <View style={[styles.emptyCard, shadow.card]}>
            <CircleDollarSign size={32} color={colors.muted} style={{ alignSelf: 'center', marginBottom: space.md }} />
            <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
              No payments on record yet.
            </Text>
            <Button label="Purchase a term" variant="primary" icon={Plus} onPress={handleStartPurchase} fullWidth />
          </View>
        )}

        {/* ── Pending verification section ─────────────────────── */}
        {!isLoading && pendingPayments.length > 0 && (
          <View>
            <Text style={[type.eyebrow, { color: colors.muted, marginBottom: space.sm }]}>
              Awaiting verification
            </Text>
            <View style={{ gap: space.sm }}>
              {pendingPayments.map(p => (
                <PaymentCard key={p.id} payment={p} onPress={setViewingPayment} />
              ))}
            </View>
          </View>
        )}

        {/* ── Payment history section ───────────────────────────── */}
        {!isLoading && historyPayments.length > 0 && (
          <View>
            <Text style={[type.eyebrow, { color: colors.muted, marginBottom: space.sm, marginTop: pendingPayments.length > 0 ? space.md : 0 }]}>
              Payment history
            </Text>
            <View style={{ gap: space.sm }}>
              {historyPayments.map(p => (
                <PaymentCard key={p.id} payment={p} onPress={setViewingPayment} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: space.xl }} />
      </ScrollView>

      {/* ── Payment detail bottom sheet ───────────────────────── */}
      <Modal
        visible={!!viewingPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingPayment(null)}
      >
        {viewingPayment && (
          <PaymentDetailSheet
            payment={viewingPayment}
            onClose={() => setViewingPayment(null)}
          />
        )}
      </Modal>

      {/* ── Purchase flow bottom sheet ────────────────────────── */}
      <Modal
        visible={!!activeIntent}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveIntent(null)}
      >
        {activeIntent && (
          <PurchaseSheet
            intent={activeIntent}
            onDone={handleFlowDone}
            onCancel={() => setActiveIntent(null)}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // layout
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.lg,
  },

  // highlight card
  highlightCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  highlightTop: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  highlightLeft: {
    flex: 1,
  },
  totalPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeTermStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },

  // payment card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 13,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },

  // status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeIcon: {
    marginRight: 3,
  },

  // empty card
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },

  // bottom sheet (shared)
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : space.lg,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  sheetClose: {
    position: 'absolute',
    top: space.lg,
    right: space.lg,
    zIndex: 10,
  },

  // detail sheet
  sheetHeader: {
    alignItems: 'center',
    marginBottom: space.lg,
    paddingTop: space.sm,
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
    gap: space.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.status.pending.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
    gap: space.sm,
  },

  // purchase sheet
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
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
    alignItems: 'center',
    marginBottom: space.sm,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.sm,
  },
  bankBox: {
    backgroundColor: colors.bank.bg,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bankHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetActions: {
    gap: space.md,
    marginTop: space.md,
  },
  errorBox: {
    backgroundColor: colors.error.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
});
