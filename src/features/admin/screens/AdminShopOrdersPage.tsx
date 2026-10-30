import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
  ExternalLink,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ShopOrder } from '@/types/shop';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const NEXT_STATES: Record<ShopOrder['status'], ShopOrder['status'][]> = {
  Pending:    ['Processing', 'Cancelled'],
  Processing: ['Shipped',    'Cancelled'],
  Shipped:    ['Delivered'],
  Delivered:  [],
  Cancelled:  [],
};

const ORDER_STATUS_STYLE: Record<ShopOrder['status'], { bg: string; fg: string }> = {
  Delivered:  { bg: colors.status.success.bg, fg: colors.status.success.fg },
  Processing: { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
  Shipped:    { bg: colors.tealSoft,           fg: colors.teal               },
  Pending:    { bg: colors.surface,            fg: colors.muted              },
  Cancelled:  { bg: colors.status.danger.bg,  fg: colors.status.danger.fg   },
};

const PAY_STATUS_STYLE: Record<ShopOrder['payment_status'], { bg: string; fg: string; label: string }> = {
  paid:                 { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Paid'                 },
  pending_verification: { bg: colors.status.pending.bg, fg: colors.status.pending.fg, label: 'Pending verification' },
  unpaid:               { bg: colors.surface,           fg: colors.muted,             label: 'Unpaid'               },
  refunded:             { bg: colors.status.danger.bg,  fg: colors.status.danger.fg,  label: 'Refunded'             },
};

function Badge({ bg, fg, text }: { bg: string; fg: string; text: string }) {
  return (
    <View style={[sty.badge, { backgroundColor: bg }]}>
      <Text style={[sty.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, fg }: { label: string; value: string | number; bg: string; fg: string }) {
  return (
    <View style={[sty.statCard, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <View style={[sty.statIcon, { backgroundColor: fg + '22' }]}>
        <ShoppingBag size={15} color={fg} strokeWidth={2} />
      </View>
      <Text style={[sty.statValue, { color: fg }]}>{value}</Text>
      <Text style={[sty.statLabel, { color: fg + 'CC' }]}>{label}</Text>
    </View>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onPress }: { order: ShopOrder; onPress: () => void }) {
  const os = ORDER_STATUS_STYLE[order.status] ?? { bg: colors.surface, fg: colors.muted };
  const ps = PAY_STATUS_STYLE[order.payment_status];
  return (
    <TouchableOpacity style={[sty.orderCard, shadow.card]} onPress={onPress} activeOpacity={0.7}>
      <View style={sty.orderCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={sty.orderNum}>{order.order_number}</Text>
          <Text style={sty.orderName}>{order.delivery_name}</Text>
          {order.delivery_email && <Text style={sty.orderEmail}>{order.delivery_email}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xs }}>
          <Text style={sty.orderTotal}>{formatMoney(order.total_cents)}</Text>
          <Text style={sty.orderDate}>{new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
        </View>
      </View>
      <View style={sty.orderBadgeRow}>
        <Badge bg={os.bg} fg={os.fg} text={order.status} />
        <Badge bg={ps.bg} fg={ps.fg} text={ps.label} />
        <Badge
          bg={order.source === 'guest' ? colors.status.pending.bg : colors.status.success.bg}
          fg={order.source === 'guest' ? colors.status.pending.fg : colors.status.success.fg}
          text={order.source === 'guest' ? 'Guest' : 'Portal'}
        />
        <View style={sty.reviewHint}>
          <Text style={sty.reviewHintText}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Text>
          <ChevronRight size={11} color={colors.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Order detail sheet ────────────────────────────────────────────────────────

function OrderDetailSheet({ order, onClose }: { order: ShopOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [statusError, setStatusError] = useState('');

  // Load receipt URL
  const { data: receiptUrl, isLoading: loadingReceipt } = useQuery<string | null>({
    queryKey: ['shop-receipt', order.id],
    queryFn:  () => dataClient.getShopReceiptUrl(order.id),
    staleTime: 30_000,
    enabled:  !!order.receipt_filename,
  });

  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: ({ action, note }: { action: 'approve' | 'reject'; note?: string }) =>
      dataClient.verifyShopOrder(order.id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allShopOrders() });
      qc.invalidateQueries({ queryKey: qk.shopStats });
      onClose();
    },
    onError: (e: any) => setVerifyError(e?.message ?? 'Failed to verify payment.'),
  });

  const { mutate: updateStatus, isPending: updatingStatus } = useMutation({
    mutationFn: (status: ShopOrder['status']) =>
      dataClient.updateShopOrderStatus(order.id, status, statusNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allShopOrders() });
      qc.invalidateQueries({ queryKey: qk.shopStats });
      onClose();
    },
    onError: (e: any) => setStatusError(e?.message ?? 'Failed to update status.'),
  });

  const nextStates = NEXT_STATES[order.status] ?? [];
  const canVerify  = order.payment_status === 'pending_verification';
  const os = ORDER_STATUS_STYLE[order.status] ?? { bg: colors.surface, fg: colors.muted };
  const ps = PAY_STATUS_STYLE[order.payment_status];

  return (
    <Pressable style={sty.backdrop} onPress={onClose}>
      <Pressable style={sty.sheet} onPress={e => e.stopPropagation()}>
        <View style={sty.sheetHandle} />

        {/* Header */}
        <View style={sty.sheetHeader}>
          <View>
            <View style={sty.badgeRow}>
              <Badge bg={os.bg} fg={os.fg} text={order.status} />
              <Badge bg={ps.bg} fg={ps.fg} text={ps.label} />
            </View>
            <Text style={sty.sheetTitle}>{order.delivery_name}</Text>
            {order.delivery_email && <Text style={sty.sheetEmail}>{order.delivery_email}</Text>}
            <Text style={sty.sheetOrderNum}>Order {order.order_number}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Delivery */}
          <Text style={sty.sectionLabel}>Delivery</Text>
          <View style={sty.detailTable}>
            <Text style={sty.deliveryText}>{order.delivery_address}</Text>
            <Text style={sty.deliveryText}>{order.delivery_phone}</Text>
          </View>

          {/* Items */}
          <Text style={sty.sectionLabel}>Items</Text>
          <View style={sty.detailTable}>
            {order.items.map((item, i) => (
              <View key={item.product_id ?? i} style={[sty.itemRow, i < order.items.length - 1 && sty.itemRowBorder]}>
                <Text style={sty.itemTitle}>{item.title} × {item.quantity}</Text>
                <Text style={sty.itemTotal}>{formatMoney(item.unit_price_cents * item.quantity)}</Text>
              </View>
            ))}
            <View style={[sty.itemRow, { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <Text style={sty.totalLabel}>Total</Text>
              <Text style={sty.totalValue}>{formatMoney(order.total_cents)}</Text>
            </View>
          </View>

          {/* Receipt */}
          {order.receipt_filename && (
            <>
              <Text style={sty.sectionLabel}>Receipt</Text>
              <View style={sty.detailTable}>
                {loadingReceipt ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <ActivityIndicator size="small" color={colors.muted} />
                    <Text style={sty.deliveryText}>Loading receipt…</Text>
                  </View>
                ) : receiptUrl ? (
                  <TouchableOpacity style={sty.receiptLink} onPress={() => Linking.openURL(receiptUrl)} activeOpacity={0.7}>
                    <ExternalLink size={14} color={colors.teal} />
                    <Text style={sty.receiptLinkText}>View receipt — {order.receipt_filename}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={sty.deliveryText}>{order.receipt_filename}</Text>
                )}
              </View>
            </>
          )}

          {/* Verify payment */}
          {canVerify && (
            <>
              <Text style={sty.sectionLabel}>Payment verification</Text>
              {!showReject ? (
                <View style={sty.verifyRow}>
                  <Button label="Reject" variant="danger" onPress={() => { setShowReject(true); setVerifyError(''); }} style={{ flex: 1 }} />
                  <Button label={verifying ? 'Approving…' : 'Approve payment'} variant="primary" icon={Check} loading={verifying} disabled={verifying} onPress={() => verify({ action: 'approve' })} style={{ flex: 2 }} />
                </View>
              ) : (
                <View style={{ gap: space.md, marginBottom: space.lg }}>
                  <TextInput
                    style={sty.textarea}
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    placeholder="Reason for rejection (required)"
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {verifyError ? <View style={sty.errorBox}><Text style={sty.errorText}>{verifyError}</Text></View> : null}
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    <Button label="Cancel" variant="ghost" onPress={() => { setShowReject(false); setVerifyError(''); }} style={{ flex: 1 }} />
                    <Button label={verifying ? 'Rejecting…' : 'Confirm reject'} variant="danger" loading={verifying} disabled={!rejectNote.trim() || verifying} onPress={() => verify({ action: 'reject', note: rejectNote.trim() })} style={{ flex: 2 }} />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Status update */}
          {nextStates.length > 0 && (
            <>
              <Text style={sty.sectionLabel}>Update order status</Text>
              <View style={{ gap: space.sm, marginBottom: space.md }}>
                <TextInput style={sty.input} value={statusNote} onChangeText={setStatusNote} placeholder="Optional note" placeholderTextColor={colors.muted} />
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  {nextStates.map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[sty.stateBtn, st === 'Cancelled' && sty.stateBtnDanger]}
                      onPress={() => updateStatus(st)}
                      disabled={updatingStatus}
                      activeOpacity={0.75}
                    >
                      <Text style={[sty.stateBtnText, st === 'Cancelled' && { color: colors.status.danger.fg }]}>→ {st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {statusError ? <View style={sty.errorBox}><Text style={sty.errorText}>{statusError}</Text></View> : null}
              </View>
            </>
          )}

          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminShopOrdersPage() {
  const qc = useQueryClient();
  const [tab,          setTab]        = useState<'pending' | 'all'>('pending');
  const [search,       setSearch]     = useState('');
  const [reviewing,    setReviewing]  = useState<ShopOrder | null>(null);
  const [refreshing,   setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: qk.shopStats,
    queryFn:  () => dataClient.getShopStats(),
    staleTime: 60_000,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: qk.allShopOrders(),
    queryFn:  () => dataClient.getAllShopOrders(),
    staleTime: 30_000,
  });

  const pending = useMemo(() => orders.filter(o => o.payment_status === 'pending_verification'), [orders]);

  const tabRows = tab === 'pending' ? pending : orders;
  const filtered = useMemo(() => {
    if (!search.trim()) return tabRows;
    const q = search.toLowerCase();
    return tabRows.filter(o =>
      o.order_number.toLowerCase().includes(q) ||
      o.delivery_name.toLowerCase().includes(q) ||
      (o.delivery_email ?? '').toLowerCase().includes(q)
    );
  }, [tabRows, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.allShopOrders() });
    await qc.invalidateQueries({ queryKey: qk.shopStats });
    setRefreshing(false);
  };

  return (
    <View style={sty.root}>
      {/* Stats */}
      <View style={sty.statsRow}>
        <StatCard label="Total orders"   value={stats?.total_orders ?? orders.length} bg={colors.pinkSoft}   fg={colors.avatar.pink.fg}   />
        <StatCard label="Pending"         value={stats?.pending_verification ?? pending.length} bg={colors.yellowSoft} fg={colors.avatar.yellow.fg} />
        <StatCard label="Revenue"         value={formatMoney(stats?.revenue_cents ?? 0)} bg={colors.tealSoft} fg={colors.avatar.teal.fg} />
        <StatCard label="Low stock"       value={stats?.low_stock_products ?? 0}       bg={colors.orangeSoft} fg={colors.avatar.orange.fg} />
      </View>

      {/* Tab + search */}
      <View style={sty.toolbarWrap}>
        <View style={sty.tabRow}>
          {(['pending', 'all'] as const).map(t => (
            <TouchableOpacity key={t} style={[sty.tabBtn, tab === t && sty.tabBtnActive]} onPress={() => { setTab(t); setSearch(''); }} activeOpacity={0.75}>
              <Text style={[sty.tabBtnText, tab === t && sty.tabBtnTextActive]}>
                {t === 'pending' ? `Pending (${pending.length})` : `All (${orders.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={sty.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput style={sty.searchInput} placeholder="Search order, customer or email…" value={search} onChangeText={setSearch} placeholderTextColor={colors.muted} returnKeyType="search" />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><X size={14} color={colors.muted} /></TouchableOpacity>}
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={sty.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={96} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => o.id}
          renderItem={({ item }) => <OrderRow order={item} onPress={() => setReviewing(item)} />}
          contentContainerStyle={sty.listContent}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={sty.emptyWrap}>
              <Text style={sty.emptyText}>{tab === 'pending' ? 'No orders pending verification.' : 'No orders yet.'}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Order detail sheet */}
      <Modal visible={!!reviewing} transparent animationType="slide" onRequestClose={() => setReviewing(null)}>
        {reviewing && <OrderDetailSheet order={reviewing} onClose={() => setReviewing(null)} />}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sty = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  statsRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.lg },
  statCard: { flex: 1, borderRadius: radius.card, padding: space.sm, alignItems: 'flex-start', borderWidth: 1, gap: 3 },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 15, lineHeight: 19 },
  statLabel: { fontFamily: 'DMSans-Regular', fontSize: 9, letterSpacing: 0.2, lineHeight: 13 },

  toolbarWrap: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  tabRow: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.pink },
  tabBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },
  tabBtnTextActive: { fontFamily: 'DMSans-Bold', color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, gap: space.sm, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  listContent: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.huge, gap: space.md },
  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },

  orderCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.md, borderWidth: 1, borderColor: colors.line },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.sm, gap: space.md },
  orderNum: { fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.muted, letterSpacing: 0.3, marginBottom: 2 },
  orderName: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  orderEmail: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },
  orderTotal: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  orderDate: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.muted },
  orderBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' },
  reviewHint: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2 },
  reviewHintText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted },

  badge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  badgeRow: { flexDirection: 'row', gap: space.xs, marginBottom: space.xs },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '94%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.lg },
  sheetTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.ink },
  sheetEmail: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, marginTop: 2 },
  sheetOrderNum: { fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.mutedSoft, marginTop: 3 },

  sectionLabel: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.mutedSoft, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: space.sm },
  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  deliveryText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink, marginBottom: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  itemTitle: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink, flex: 1 },
  itemTotal: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  totalLabel: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  totalValue: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.pink },

  receiptLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  receiptLinkText: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.teal, flex: 1 },

  verifyRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  textarea: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, minHeight: 72, borderWidth: 1, borderColor: colors.line, fontSize: 14, color: colors.ink, lineHeight: 20 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 14, color: colors.ink, minHeight: 44 },

  stateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs, borderWidth: 1, borderColor: colors.line },
  stateBtnDanger: { borderColor: colors.status.danger.bg, backgroundColor: colors.status.danger.bg },
  stateBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.ink },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
});
