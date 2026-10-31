import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ShopOrder } from '@/types/shop';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const ORDER_STATUS_STYLE: Record<ShopOrder['status'], { bg: string; fg: string }> = {
  Pending:    { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
  Processing: { bg: colors.tealSoft,          fg: colors.teal },
  Shipped:    { bg: colors.status.info.bg,    fg: colors.status.info.fg },
  Delivered:  { bg: colors.status.success.bg, fg: colors.status.success.fg },
  Cancelled:  { bg: colors.status.danger.bg,   fg: colors.status.danger.fg },
};

const PAY_STATUS_STYLE: Record<ShopOrder['payment_status'], { bg: string; fg: string; label: string }> = {
  paid:                 { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Paid' },
  pending_verification: { bg: colors.status.pending.bg,  fg: colors.status.pending.fg,  label: 'Pending verification' },
  unpaid:               { bg: colors.surface,           fg: colors.muted,             label: 'Unpaid' },
  refunded:             { bg: colors.status.danger.bg,   fg: colors.status.danger.fg,   label: 'Refunded' },
};

function Badge({ bg, fg, text }: { bg: string; fg: string; text: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// ── Order detail sheet ────────────────────────────────────────────────────────

function OrderDetailSheet({ order, onClose }: { order: ShopOrder; onClose: () => void }) {
  const os = ORDER_STATUS_STYLE[order.status] ?? { bg: colors.surface, fg: colors.muted };
  const ps = PAY_STATUS_STYLE[order.payment_status];
  const date = new Date(order.created_at).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Order {order.order_number}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sheetDate}>{date}</Text>

        <View style={styles.badgeRow}>
          <Badge bg={os.bg} fg={os.fg} text={order.status} />
          <Badge bg={ps.bg} fg={ps.fg} text={ps.label} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Items */}
          <Text style={styles.sectionLabel}>Items</Text>
          <View style={styles.detailTable}>
            {order.items.map((item, i) => (
              <View
                key={item.product_id ?? i}
                style={[styles.itemRow, i < order.items.length - 1 && styles.itemRowBorder]}
              >
                <Text style={styles.itemTitle}>{item.title} × {item.quantity}</Text>
                <Text style={styles.itemTotal}>{formatMoney(item.unit_price_cents * item.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.itemRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(order.total_cents)}</Text>
            </View>
          </View>

          {/* Payment */}
          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.detailTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Method</Text>
              <Text style={styles.metaValue}>
                {order.payment_method === 'cod' ? 'Cash on delivery' : 'Bank transfer'}
              </Text>
            </View>
            {order.receipt_filename && (
              <View style={[styles.metaRow, styles.metaRowBorder]}>
                <Text style={styles.metaLabel}>Receipt</Text>
                <Text style={[styles.metaValue, { color: colors.teal }]} numberOfLines={1}>
                  {order.receipt_filename}
                </Text>
              </View>
            )}
          </View>

          {/* Delivery */}
          <Text style={styles.sectionLabel}>Delivery</Text>
          <View style={styles.detailTable}>
            <Text style={styles.deliveryText}>{order.delivery_name}</Text>
            <Text style={styles.deliveryText}>{order.delivery_address}</Text>
            <Text style={styles.deliveryText}>{order.delivery_phone}</Text>
            {order.delivery_email ? <Text style={styles.deliveryText}>{order.delivery_email}</Text> : null}
          </View>

          {/* Admin note */}
          {order.review_note && (
            <>
              <Text style={styles.sectionLabel}>Note from admin</Text>
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{order.review_note}</Text>
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

export function MyOrdersPage({ navigation }: any) {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: qk.shopOrders(familyId ?? ''),
    queryFn: () => dataClient.getShopOrders(familyId!),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const sorted = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: qk.shopOrders(familyId ?? '') });
    setRefreshing(false);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
      >
        <Text style={styles.pageTitle}>My Orders</Text>
        <Text style={styles.pageSub}>Browse your learning shop purchases.</Text>

        {isLoading ? (
          <View style={{ gap: space.md, marginTop: space.lg }}>
            <Skeleton height={96} borderRadius={radius.card} />
            <Skeleton height={96} borderRadius={radius.card} />
            <Skeleton height={96} borderRadius={radius.card} />
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Package size={32} color={colors.muted} />
            <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.md, marginBottom: space.lg }]}>
              You haven't placed any orders yet.
            </Text>
            <Button
              label="Browse the shop"
              variant="primary"
              icon={Package}
              onPress={() => navigation.navigate('LearningShop')}
            />
          </View>
        ) : (
          <View style={{ gap: space.md, marginTop: space.lg }}>
            {sorted.map((order) => {
              const os = ORDER_STATUS_STYLE[order.status] ?? { bg: colors.surface, fg: colors.muted };
              const ps = PAY_STATUS_STYLE[order.payment_status];
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, shadow.card]}
                  onPress={() => setSelectedOrder(order)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderIcon}>
                    <Package size={18} color={colors.pink} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNum}>{order.order_number}</Text>
                    <Text style={styles.orderMeta}>
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatMoney(order.total_cents)}
                    </Text>
                    <View style={styles.orderBadgeRow}>
                      <Badge bg={os.bg} fg={os.fg} text={order.status} />
                      <Badge bg={ps.bg} fg={ps.fg} text={ps.label} />
                    </View>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.viewLink}>View →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <OrderDetailSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.huge },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },

  // empty
  emptyCard: {
    backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line,
    padding: space.xl, alignItems: 'center', marginTop: space.lg,
  },

  // order card
  orderCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line,
  },
  orderIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  orderInfo: { flex: 1, minWidth: 0 },
  orderNum: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.ink },
  orderMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  orderBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 6 },
  orderRight: { alignItems: 'flex-end', flexShrink: 0 },
  orderDate: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted },
  viewLink: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.pink, marginTop: 6 },

  // badge
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  badgeRow: { flexDirection: 'row', gap: space.xs, marginBottom: space.lg },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: colors.ink },
  sheetDate: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, marginBottom: space.lg },

  sectionLabel: {
    fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.mutedSoft,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: space.sm, marginTop: space.lg,
  },
  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  itemTitle: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink, flex: 1 },
  itemTotal: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },

  totalRow: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: space.xs, paddingTop: space.md },
  totalLabel: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  totalValue: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.pink },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
  metaRowBorder: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: space.xs, paddingTop: space.sm },
  metaLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  metaValue: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink, textAlign: 'right', flex: 1.5, marginLeft: 12 },

  deliveryText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink, marginBottom: 2 },

  noteBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md },
  noteText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink, lineHeight: 18 },
});
