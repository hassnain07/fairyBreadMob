import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function MyOrdersPage({ navigation }: any) {
  const { familyId } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['shop-orders', familyId],
    queryFn: () => dataClient.getShopOrders?.(familyId || '') || Promise.resolve([]),
    enabled: !!familyId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusMap: Record<string, { bg: string; fg: string }> = {
    pending: colors.status.pending,
    approved: colors.status.success,
    rejected: colors.status.danger,
    shipped: { bg: '#E3F2FD', fg: '#1976D2' },
    delivered: colors.status.success,
    cancelled: colors.status.danger,
  };

  const renderOrderCard = (order: any) => {
    const status = statusMap[order.status] || colors.status.info;
    const dateStr = new Date(order.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' });

    return (
      <TouchableOpacity 
        key={order.id}
        style={[styles.card, shadow.card as object]}
        onPress={() => setSelectedOrder(order)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase', marginBottom: space.xs }]}>
              Order #{order.id.substring(0, 8).toUpperCase()}
            </Text>
            <Text style={[type.h3, { color: colors.ink }]}>
              ${order.total_price?.toFixed(2) || '0.00'}
            </Text>
            <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
              {dateStr}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[type.pill, { color: status.fg }]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </View>

        {order.items && order.items.length > 0 && (
          <View style={{ marginTop: space.lg, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.lg }}>
            <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase', marginBottom: space.sm }]}>
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </Text>
            {order.items.slice(0, 2).map((item: any, idx: number) => (
              <Text key={idx} style={[type.small, { color: colors.ink, marginBottom: space.xs }]}>
                • {item.product_name} {item.quantity > 1 ? `(×${item.quantity})` : ''}
              </Text>
            ))}
            {order.items.length > 2 && (
              <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                + {order.items.length - 2} more
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const isEmpty = orders.length === 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
          My Orders
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
          Browse your learning shop purchases.
        </Text>

        {isLoading ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={120} borderRadius={radius.card} />
            <Skeleton height={120} borderRadius={radius.card} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
              No orders yet. Browse the learning shop to get started.
            </Text>
            <Button label="Explore shop →" onPress={() => navigation.navigate('LearningShop')} />
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {sortedOrders.map(renderOrderCard)}
          </View>
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Text style={[type.h3, { color: colors.pink }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[type.h2, { color: colors.ink, flex: 1, marginLeft: space.lg }]}>
                Order #{selectedOrder?.id.substring(0, 8).toUpperCase()}
              </Text>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status & Date */}
              <View style={[styles.card, shadow.card as object]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase', marginBottom: space.xs }]}>
                      Status
                    </Text>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {selectedOrder?.status.charAt(0).toUpperCase() + selectedOrder?.status.slice(1)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase', marginBottom: space.xs }]}>
                      Order Date
                    </Text>
                    <Text style={[type.h3, { color: colors.ink, textAlign: 'right' }]}>
                      {new Date(selectedOrder?.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items */}
              <View style={[styles.card, shadow.card as object]}>
                <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                  Items
                </Text>
                {selectedOrder?.items?.map((item: any, idx: number) => (
                  <View key={idx} style={[styles.itemRow, idx < selectedOrder.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                        {item.product_name}
                      </Text>
                      <Text style={[type.caption, { color: colors.muted, marginTop: space.xs }]}>
                        Qty: {item.quantity}
                      </Text>
                    </View>
                    <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}

                {/* Totals */}
                <View style={{ marginTop: space.lg, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.lg }}>
                  {selectedOrder?.subtotal && (
                    <View style={styles.totalRow}>
                      <Text style={[type.small, { color: colors.muted }]}>Subtotal</Text>
                      <Text style={[type.small, { color: colors.muted }]}>
                        ${selectedOrder.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {selectedOrder?.tax && (
                    <View style={styles.totalRow}>
                      <Text style={[type.small, { color: colors.muted }]}>Tax</Text>
                      <Text style={[type.small, { color: colors.muted }]}>
                        ${selectedOrder.tax.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md }]}>
                    <Text style={[type.h3, { color: colors.ink }]}>Total</Text>
                    <Text style={[type.h3, { color: colors.pink }]}>
                      ${selectedOrder?.total_price?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Method */}
              {selectedOrder?.payment_method && (
                <View style={[styles.card, shadow.card as object]}>
                  <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
                    Payment Method
                  </Text>
                  <Text style={[type.small, { color: colors.ink }]}>
                    {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                  </Text>
                  {selectedOrder.payment_method === 'bank_transfer' && selectedOrder.proof_url && (
                    <Text style={[type.caption, { color: colors.muted, marginTop: space.md }]}>
                      Proof of payment uploaded
                    </Text>
                  )}
                </View>
              )}

              {/* Notes */}
              {selectedOrder?.admin_notes && (
                <View style={[styles.card, styles.cardWarning, shadow.card as object]}>
                  <Text style={[type.h3, { color: colors.orange, marginBottom: space.lg }]}>
                    Admin Notes
                  </Text>
                  <Text style={[type.small, { color: colors.ink }]}>
                    {selectedOrder.admin_notes}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button label="Close" onPress={() => setSelectedOrder(null)} />
            </View>
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
  cardWarning: {
    backgroundColor: '#FFF0E9',
    borderColor: '#FFD2B9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
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
    maxHeight: '90%',
    paddingTop: space.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalBody: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  modalFooter: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
