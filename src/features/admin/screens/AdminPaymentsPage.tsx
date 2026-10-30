import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Search,
  X,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Payment, PaymentStatus } from '@/types/payment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const STATUS_STYLE: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
  paid:     { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Paid' },
  pending:  { bg: colors.status.pending.bg,  fg: colors.status.pending.fg,  label: 'Pending' },
  failed:   { bg: colors.status.danger.bg,   fg: colors.status.danger.fg,   label: 'Failed' },
  rejected: { bg: colors.status.danger.bg,   fg: colors.status.danger.fg,   label: 'Rejected' },
};

function typeLabel(p: Payment) {
  if (p.type === 'term') return 'Term';
  if (p.type === 'assessment') return 'Assessment';
  return 'Individual';
}

function typeBadgeStyle(p: Payment) {
  return p.type === 'term'
    ? { bg: colors.status.success.bg, fg: colors.status.success.fg }
    : { bg: colors.surface, fg: colors.muted };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, fg, icon: Icon }: {
  label: string; value: string; bg: string; fg: string;
  icon: React.ComponentType<any>;
}) {
  return (
    <View style={[s.statCard, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <View style={[s.statIcon, { backgroundColor: fg + '22' }]}>
        <Icon size={17} color={fg} strokeWidth={2} />
      </View>
      <Text style={[s.statValue, { color: fg }]}>{value}</Text>
      <Text style={[s.statLabel, { color: fg + 'CC' }]}>{label}</Text>
    </View>
  );
}

// ── Payment row ────────────────────────────────────────────────────────────────

function PaymentRow({ payment, onReview }: { payment: Payment; onReview: () => void }) {
  const ss = STATUS_STYLE[payment.status];
  const tb = typeBadgeStyle(payment);
  const isPending = payment.status === 'pending';
  const detail =
    payment.type === 'term'
      ? (payment.term_label ?? 'Term payment')
      : `${payment.details.subject ?? payment.type}${payment.details.child_name ? ' · ' + payment.details.child_name : ''}`;

  return (
    <TouchableOpacity
      style={[s.paymentCard, shadow.card]}
      onPress={isPending ? onReview : undefined}
      activeOpacity={isPending ? 0.7 : 1}
      disabled={!isPending}
    >
      <View style={s.paymentBody}>
        <Text style={s.paymentFamily} numberOfLines={1}>{payment.family_name ?? payment.family_id}</Text>
        <View style={s.paymentMetaRow}>
          <View style={[s.typeBadge, { backgroundColor: tb.bg }]}>
            <Text style={[s.typeText, { color: tb.fg }]}>{typeLabel(payment)}</Text>
          </View>
          <Text style={s.paymentDetail} numberOfLines={1}>{detail}</Text>
        </View>
        <Text style={s.paymentRef}>{payment.reference}</Text>
      </View>

      <View style={s.paymentRight}>
        <Text style={s.paymentAmount}>{formatMoney(payment.total_cents)}</Text>
        <Text style={s.paymentDate}>
          {new Date(payment.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: ss.bg }]}>
          <Text style={[s.statusText, { color: ss.fg }]}>{ss.label}</Text>
        </View>
        {isPending && (
          <View style={s.reviewBtn}>
            <Text style={s.reviewBtnText}>Review</Text>
            <ChevronRight size={11} color={colors.pink} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Review sheet ──────────────────────────────────────────────────────────────

function ReviewSheet({
  payment, onClose, onApprove, onReject, verifying, error,
  rejectNote, setRejectNote,
}: {
  payment: Payment | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  verifying: boolean;
  error: string;
  rejectNote: string;
  setRejectNote: (v: string) => void;
}) {
  const { data: proofUrl, isLoading: proofLoading, error: proofErr } = useQuery<string | null>({
    queryKey: ['proof-url', payment?.id],
    queryFn:  () => dataClient.getProofUrl(payment!.id),
    enabled:  !!payment,
    staleTime: 30_000,
  });

  if (!payment) return null;

  const rows: { label: string; value: string }[] = [
    { label: 'Family',    value: payment.family_name ?? payment.family_id },
    { label: 'Type',       value: payment.type === 'term' ? 'Term payment' : payment.type === 'assessment' ? 'Assessment' : 'Individual class' },
  ];
  if (payment.type === 'term' && payment.term_label) rows.push({ label: 'Term', value: payment.term_label });
  if (payment.type !== 'term' && payment.details.child_name) rows.push({ label: 'Child', value: payment.details.child_name });
  if (payment.type === 'individual_class' && payment.details.subject)
    rows.push({ label: 'Class', value: `${payment.details.subject}${payment.details.day ? ' · ' + payment.details.day : ''}${payment.details.time ? ' ' + payment.details.time : ''}` });
  if (payment.type === 'individual_class' && payment.details.tutor)
    rows.push({ label: 'Tutor', value: payment.details.tutor });
  rows.push({ label: 'Reference', value: payment.reference });
  rows.push({ label: 'Amount',    value: `${formatMoney(payment.amount_cents)} + ${formatMoney(payment.gst_cents)} GST = ${formatMoney(payment.total_cents)} AUD` });
  if (payment.type === 'term') rows.push({ label: 'Credits', value: '10 class credits unlocked on approval' });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Verify payment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={s.sheetDesc}>Review the submitted proof and approve or reject this payment.</Text>

          {/* Proof preview */}
          <View style={s.proofBox}>
            {proofLoading ? (
              <View style={s.proofInner}><ActivityIndicator color={colors.muted} size="small" /></View>
            ) : proofUrl ? (
              <TouchableOpacity style={s.proofInner} onPress={() => { /* could open via Linking */ }} activeOpacity={0.7}>
                <ExternalLink size={15} color={colors.teal} />
                <Text style={s.proofLink} numberOfLines={1}>View proof — {payment.proof_filename ?? 'receipt'}</Text>
              </TouchableOpacity>
            ) : proofErr ? (
              <View style={s.proofInner}>
                <Text style={s.proofError}>Could not load proof — it may have been deleted from storage.</Text>
              </View>
            ) : (
              <View style={s.proofInner}><Text style={s.proofMuted}>No receipt uploaded</Text></View>
            )}
          </View>

          {/* Detail rows */}
          <View style={s.detailTable}>
            {rows.map((r, i) => (
              <View key={i} style={[s.detailRow, i < rows.length - 1 && s.detailRowBorder]}>
                <Text style={s.detailLabel}>{r.label}</Text>
                <Text style={s.detailValue} numberOfLines={2}>{r.value}</Text>
              </View>
            ))}
          </View>

          {/* Rejection note */}
          <Text style={s.fieldLabel}>
            Rejection note <Text style={{ color: colors.orange }}>(required to reject)</Text>
          </Text>
          <TextInput
            style={s.textarea}
            value={rejectNote}
            onChangeText={setRejectNote}
            placeholder="e.g. Reference number doesn't match, please resubmit with the correct reference."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <View style={s.sheetFooter}>
            <Button label="Reject" variant="danger" icon={X} onPress={onReject} loading={verifying} disabled={verifying} style={{ flex: 1 }} />
            <Button label={verifying ? 'Saving…' : 'Approve payment'} variant="primary" icon={Check} onPress={onApprove} loading={verifying} disabled={verifying} style={{ flex: 2 }} />
          </View>
          <View style={{ height: space.xl }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [tab,          setTab]        = useState<'pending' | 'all'>('pending');
  const [search,       setSearch]    = useState('');
  const [refreshing,   setRefreshing] = useState(false);
  const [reviewing,    setReviewing]  = useState<Payment | null>(null);
  const [rejectNote,   setRejectNote] = useState('');
  const [actionError,  setActionError] = useState('');

  const { data: allPayments = [], isLoading } = useQuery({
    queryKey: qk.allPayments,
    queryFn:  () => dataClient.getAllPayments(),
    staleTime: 30_000,
  });

  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note?: string }) =>
      dataClient.verifyPayment(id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allPayments });
      qc.invalidateQueries({ queryKey: qk.allTerms });
      qc.invalidateQueries({ queryKey: qk.adminStats });
      setReviewing(null);
      setRejectNote('');
      setActionError('');
    },
    onError: (e: any) => setActionError(e?.message ?? 'Failed to verify payment.'),
  });

  // Stats
  const paidTotal     = useMemo(() => allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total_cents, 0), [allPayments]);
  const pendingTotal  = useMemo(() => allPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.total_cents, 0), [allPayments]);
  const rejectedTotal = useMemo(() => allPayments.filter(p => p.status === 'rejected' || p.status === 'failed').reduce((s, p) => s + p.total_cents, 0), [allPayments]);
  const pendingCount  = allPayments.filter(p => p.status === 'pending').length;

  // Filtered rows
  const tabRows = tab === 'pending' ? allPayments.filter(p => p.status === 'pending') : allPayments;
  const filtered = useMemo(() => {
    if (!search.trim()) return tabRows;
    const q = search.toLowerCase();
    return tabRows.filter(p =>
      (p.family_name ?? '').toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
    );
  }, [tabRows, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.allPayments });
    setRefreshing(false);
  };

  const openReview = (p: Payment) => {
    setReviewing(p);
    setRejectNote('');
    setActionError('');
  };

  const handleApprove = () => {
    if (!reviewing) return;
    verify({ id: reviewing.id, action: 'approve' });
  };

  const handleReject = () => {
    if (!reviewing) return;
    if (!rejectNote.trim()) { setActionError('A rejection note is required.'); return; }
    verify({ id: reviewing.id, action: 'reject', note: rejectNote.trim() });
  };

  return (
    <View style={s.root}>
      {/* ── Stats ────────────────────────────────────────── */}
      <View style={s.statsRow}>
        <StatCard label="Paid this term"        value={formatMoney(paidTotal)}     bg={colors.tealSoft}    fg={colors.avatar.teal.fg}    icon={Check} />
        <StatCard label="Pending verification"  value={formatMoney(pendingTotal)}   bg={colors.yellowSoft}  fg={colors.avatar.yellow.fg}  icon={Clock3} />
        <StatCard label="Rejected / Failed"     value={formatMoney(rejectedTotal)}  bg={colors.orangeSoft}  fg={colors.avatar.orange.fg}  icon={X} />
      </View>

      {/* ── Tab toggle + search ───────────────────────────── */}
      <View style={s.toolbarWrap}>
        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tabBtn, tab === 'pending' && s.tabBtnActive]} onPress={() => { setTab('pending'); setSearch(''); }} activeOpacity={0.75}>
            <Text style={[s.tabBtnText, tab === 'pending' && s.tabBtnTextActive]}>Pending review</Text>
            <View style={[s.tabCount, tab === 'pending' && s.tabCountActive]}><Text style={[s.tabCountText, tab === 'pending' && s.tabCountTextActive]}>{pendingCount}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, tab === 'all' && s.tabBtnActive]} onPress={() => { setTab('all'); setSearch(''); }} activeOpacity={0.75}>
            <Text style={[s.tabBtnText, tab === 'all' && s.tabBtnTextActive]}>All payments</Text>
            <View style={[s.tabCount, tab === 'all' && s.tabCountActive]}><Text style={[s.tabCountText, tab === 'all' && s.tabCountTextActive]}>{allPayments.length}</Text></View>
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by family or reference…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><X size={14} color={colors.muted} /></TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ──────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={92} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={({ item }) => <PaymentRow payment={item} onReview={() => openReview(item)} />}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>
                {tab === 'pending' ? 'No payments pending verification.' : 'No payments found.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Review sheet ──────────────────────────────────── */}
      <ReviewSheet
        payment={reviewing}
        onClose={() => { setReviewing(null); setActionError(''); setRejectNote(''); }}
        onApprove={handleApprove}
        onReject={handleReject}
        verifying={verifying}
        error={actionError}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // stats
  statsRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.lg },
  statCard: { flex: 1, borderRadius: radius.card, padding: space.md, alignItems: 'flex-start', borderWidth: 1, gap: 4 },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 22 },
  statLabel: { fontFamily: 'DMSans-Regular', fontSize: 10, letterSpacing: 0.3, lineHeight: 14 },

  // toolbar
  toolbarWrap: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  tabRow: { flexDirection: 'row', gap: space.sm },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tabBtnActive: { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
  tabBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },
  tabBtnTextActive: { fontFamily: 'DMSans-Bold', color: colors.pink },
  tabCount: { backgroundColor: colors.surface, borderRadius: radius.pill, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountActive: { backgroundColor: colors.pink },
  tabCountText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: colors.muted, lineHeight: 11 },
  tabCountTextActive: { color: '#fff' },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, gap: space.sm, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  // list
  listContent: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.huge, gap: space.md },
  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },

  // payment card
  paymentCard: { flexDirection: 'row', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, padding: space.md, borderWidth: 1, borderColor: colors.line },
  paymentBody: { flex: 1, gap: 3 },
  paymentFamily: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  paymentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  typeText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  paymentDetail: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },
  paymentRef: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.mutedSoft },
  paymentRight: { alignItems: 'flex-end', gap: space.xs, justifyContent: 'center' },
  paymentAmount: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  paymentDate: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.muted },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.pink },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  // proof
  proofBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.line, marginBottom: space.lg },
  proofInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  proofLink: { flex: 1, fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.teal },
  proofMuted: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  proofError: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.orange, flex: 1 },

  // detail table
  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: space.sm, gap: space.md },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  detailValue: { flex: 1, fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink, textAlign: 'right' },

  // field
  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  textarea: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, minHeight: 80, borderWidth: 1, borderColor: colors.line, fontSize: 14, color: colors.ink, lineHeight: 20, textAlignVertical: 'top', marginBottom: space.md },

  // error + footer
  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border, marginBottom: space.md },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md, paddingBottom: space.lg },
});
