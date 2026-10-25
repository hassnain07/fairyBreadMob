import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Printer } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

interface ShopOrderStatus {
  id: string;
  order_number: string;
  delivery_name: string;
  delivery_email: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment_status: 'paid' | 'pending_verification' | 'unpaid' | 'refunded';
  total_cents: number;
  items: Array<{ title: string; quantity: number; unit_price_cents: number }>;
}

const NEXT_STATES: Record<string, string[]> = {
  'Pending': ['Processing', 'Cancelled'],
  'Processing': ['Shipped', 'Cancelled'],
  'Shipped': ['Delivered'],
  'Delivered': [],
  'Cancelled': [],
};

function OrderStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, { bg: string; fg: string }> = {
    'Delivered': colors.status.success,
    'Processing': { bg: '#FFF8DF', fg: '#AD8917' },
    'Shipped': { bg: '#E9F8F6', fg: '#218C92' },
    'Pending': { bg: '#F4F7F3', fg: '#75817D' },
    'Cancelled': colors.status.danger,
  };
  const st = statusColors[status] || { bg: colors.surface, fg: colors.muted };
  return (
    <View style={{ backgroundColor: st.bg, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={[type.pill, { color: st.fg }]}>{status}</Text>
    </View>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, { bg: string; fg: string }> = {
    'paid': colors.status.success,
    'pending_verification': { bg: '#FFF8DF', fg: '#AD8917' },
    'unpaid': { bg: '#F4F7F3', fg: '#75817D' },
    'refunded': colors.status.danger,
  };
  const st = statusColors[status] || { bg: colors.surface, fg: colors.muted };
  const label = { paid: 'Paid', pending_verification: 'Pending verification', unpaid: 'Unpaid', refunded: 'Refunded' }[status] || status;
  return (
    <View style={{ backgroundColor: st.bg, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={[type.pill, { color: st.fg }]}>{label}</Text>
    </View>
  );
}

function OrderDetailModal({ order, onClose }: { order: ShopOrderStatus | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');

  const statusMutation = useMutation({
    mutationFn: (status: string) => dataClient.updateShopOrderStatus?.(order!.id, status, statusNote || undefined) || Promise.resolve(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-orders'] });
      onClose();
    },
  });

  if (!order) return null;

  const nextStates = NEXT_STATES[order.status] || [];
  const total = order.items.reduce((sum, item) => sum + (item.unit_price_cents * item.quantity), 0);

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, shadow.sheet as object]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h3, { color: colors.ink, flex: 1 }]}>Order {order.order_number}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* Status badges */}
            <View style={{ gap: space.sm, marginBottom: space.lg }}>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
            </View>

            {/* Customer info */}
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>{order.delivery_name}</Text>
            <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{order.delivery_email}</Text>

            {/* Items */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: space.md, marginVertical: space.md }}>
              {order.items.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm }}>
                  <Text style={[type.small, { color: colors.ink }]}>{item.title} × {item.quantity}</Text>
                  <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                    ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTopMargin: space.md }}>
                <Text style={[type.bodyStrong, { color: colors.ink }]}>Total</Text>
                <Text style={[type.bodyStrong, { color: colors.ink }]}>${(total / 100).toFixed(2)}</Text>
              </View>
            </View>

            {/* Status update */}
            {nextStates.length > 0 && (
              <View style={{ marginTop: space.lg }}>
                <Text style={[type.small, { color: colors.mutedSoft, marginBottom: space.sm, textTransform: 'uppercase' }]}>Update status</Text>
                <View style={{ gap: space.sm }}>
                  {nextStates.map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOption,
                        selectedStatus === st && { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
                      ]}
                      onPress={() => setSelectedStatus(st)}
                    >
                      <Text style={[type.body, { color: selectedStatus === st ? colors.pink : colors.ink }]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedStatus && (
                  <View style={{ marginTop: space.md }}>
                    <Button label="Update status" variant="primary" onPress={() => statusMutation.mutate(selectedStatus)} />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function AdminShopOrdersPage() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<ShopOrderStatus | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['shop-orders'],
    queryFn: () => dataClient.getAllShopOrders?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderOrder = ({ item }: { item: ShopOrderStatus }) => (
    <TouchableOpacity
      style={[styles.orderCard, shadow.card as object]}
      onPress={() => setSelectedOrder(item)}
    >
      <View style={{ marginBottom: space.sm }}>
        <Text style={[type.h3, { color: colors.ink }]}>Order {item.order_number}</Text>
        <Text style={[type.small, { color: colors.muted }]}>{item.delivery_name}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: space.xs }}>
          <OrderStatusBadge status={item.status} />
          <PaymentStatusBadge status={item.payment_status} />
        </View>
        <Text style={[type.bodyStrong, { color: colors.ink }]}>${(item.total_cents / 100).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.contentPadding}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.lg }}>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>Shop Orders</Text>
            <Text style={[type.body, { color: colors.muted }]}>Review and manage learning shop orders.</Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyBox}>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>No orders yet.</Text>
            </View>
          )
        }
      />
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </View>
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
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalScroll: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  statusOption: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
});
