import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Search, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { dataClient } from '@/lib/data/client';

const CATEGORIES = ['All', 'Workbooks', 'Flash Cards', 'Activity Kits'];

export function LearningShopPage() {
  const { familyId, user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment' | 'receipt' | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState({
    fullName: user?.fullName || '',
    deliveryAddress: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [proof, setProof] = useState<ProofFile | null>(null);

  const { data: products = [], isLoading: productsLoading, refetch } = useQuery({
    queryKey: ['shopProducts'],
    queryFn: () => dataClient.getShopProducts?.() || Promise.resolve([]),
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!familyId || cart.length === 0) throw new Error('Invalid order');

      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const input = {
        items: items.map(item => ({ product_id: item.id, quantity: item.cartQuantity })),
        delivery_address: deliveryDetails.deliveryAddress,
        phone: deliveryDetails.phone,
        payment_method: paymentMethod as 'cod' | 'bank_transfer',
        proof: proof || undefined,
      } as any;

      const order = await dataClient.placeOrder?.(input);
      return order;
    },
    onSuccess: () => {
      setCheckoutStep('receipt');
      setCart([]);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id && item.quantity < (product.stock || 10)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (checkoutStep === 'cart' || (checkoutStep === null && cart.length > 0)) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <View style={styles.headerRow}>
          <Text style={[type.h2, { color: colors.ink }]}>Your cart</Text>
          <TouchableOpacity onPress={() => setCheckoutStep(null)}>
            <X size={24} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {cart.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted }]}>Your cart is empty.</Text>
          </View>
        ) : (
          <>
            {cart.map(item => (
              <View key={item.id} style={[styles.card, shadow.card as object]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md }}>
                  <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{item.title}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <X size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[type.small, { color: colors.muted }]}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                  <View style={styles.quantityStepper}>
                    <TouchableOpacity
                      onPress={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                      style={styles.stepperButton}
                    >
                      <Text style={[type.button, { color: colors.ink }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[type.small, { color: colors.ink }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => setCart(cart.map(i => i.id === item.id && i.quantity < (item.stock || 10) ? { ...i, quantity: i.quantity + 1 } : i))}
                      style={styles.stepperButton}
                    >
                      <Text style={[type.button, { color: colors.ink }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={[styles.card, shadow.card as object]}>
              <View style={styles.totalRow}>
                <Text style={[type.h3, { color: colors.ink }]}>Total</Text>
                <Text style={[type.h3, { color: colors.pink }]}>${cartTotal.toFixed(2)}</Text>
              </View>
            </View>

            <Button
              label="Continue to checkout →"
              onPress={() => setCheckoutStep('details')}
              style={{ marginTop: space.lg }}
            />
          </>
        )}
      </ScrollView>
    );
  }

  if (checkoutStep === 'details') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Your details</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name *"
          value={deliveryDetails.fullName}
          onChangeText={v => setDeliveryDetails({ ...deliveryDetails, fullName: v })}
          placeholderTextColor={colors.muted}
        />

        <TextInput
          style={styles.input}
          placeholder="Delivery address *"
          value={deliveryDetails.deliveryAddress}
          onChangeText={v => setDeliveryDetails({ ...deliveryDetails, deliveryAddress: v })}
          placeholderTextColor={colors.muted}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone *"
          value={deliveryDetails.phone}
          onChangeText={v => setDeliveryDetails({ ...deliveryDetails, phone: v })}
          keyboardType="phone-pad"
          placeholderTextColor={colors.muted}
        />

        <View style={styles.footer}>
          <Button
            variant="ghost"
            label="← Back"
            onPress={() => setCheckoutStep('cart')}
            style={{ flex: 1, marginRight: space.md }}
          />
          <Button
            label="Continue →"
            onPress={() => setCheckoutStep('payment')}
            disabled={!deliveryDetails.fullName || !deliveryDetails.deliveryAddress || !deliveryDetails.phone}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  if (checkoutStep === 'payment') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Payment method</Text>

        {[
          { key: 'cod', label: 'Cash on delivery', desc: 'Pay when your order arrives' },
          { key: 'bank', label: 'Bank transfer', desc: 'Upload your receipt after paying' },
        ].map(option => (
          <TouchableOpacity
            key={option.key}
            style={[styles.paymentOption, paymentMethod === option.key && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod(option.key as any)}
          >
            <View style={styles.paymentRadio}>
              {paymentMethod === option.key && <View style={styles.paymentRadioSelected} />}
            </View>
            <View>
              <Text style={[type.body, { color: colors.ink }]}>{option.label}</Text>
              <Text style={[type.small, { color: colors.muted }]}>{option.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {paymentMethod === 'bank' && (
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.caption, { color: colors.muted, marginBottom: space.md }]}>Bank details</Text>
            <Text style={[type.small, { color: colors.ink }]}>BSB: 123-456</Text>
            <Text style={[type.small, { color: colors.ink }]}>Account: 98765432</Text>
            <Text style={[type.small, { color: colors.ink, marginTop: space.md }]}>Reference: {`REF-SHOP`}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            variant="ghost"
            onPress={() => setCheckoutStep('details')}
            style={{ flex: 1, marginRight: space.md }}
          >
            ← Back
          </Button>
          <Button
            variant="ghost"
            label="← Back"
            onPress={() => paymentMethod === 'cod' ? placeOrderMutation.mutate() : setCheckoutStep('receipt')}
            loading={placeOrderMutation.isPending}
            style={{ flex: 1, marginRight: space.md }}
          />
          <Button
            label={paymentMethod === 'cod' ? 'Place order' : 'Continue →'}
            onPress={() => paymentMethod === 'cod' ? placeOrderMutation.mutate() : setCheckoutStep('receipt')}
            loading={placeOrderMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  if (checkoutStep === 'receipt') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Upload receipt</Text>

        <ProofPicker
          onChange={setProof}
          value={proof}
        />

        <View style={styles.footer}>
          <Button
            variant="ghost"
            label="← Back"
            onPress={() => setCheckoutStep('payment')}
            style={{ flex: 1, marginRight: space.md }}
          />
          <Button
            label="Place order →"
            onPress={() => placeOrderMutation.mutate()}
            disabled={!proof}
            loading={placeOrderMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  // Main shop view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[type.h2, { color: colors.ink }]}>Learning shop</Text>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => setCheckoutStep('cart')}
          >
            <ShoppingCart size={24} color={colors.pink} />
            {cart.length > 0 && (
              <View style={styles.badge}>
                <Text style={[type.pill, { color: '#fff' }]}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Search size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[type.small, { color: selectedCategory === cat ? '#fff' : colors.ink }]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={item => item.id}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productsContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productImage} />
            <Text style={[type.small, { color: colors.ink, marginTop: space.md }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[type.h3, { color: colors.pink, marginTop: space.xs }]}>
              ${item.price.toFixed(2)}
            </Text>

            <View style={[styles.stockPill, item.stock ? styles.stockAvailable : styles.stockUnavailable]}>
              <Text style={[type.pill, item.stock ? { color: colors.status.success.fg } : { color: colors.status.danger.fg }]}>
                {item.stock ? `${item.stock} in stock` : 'Out of stock'}
              </Text>
            </View>

            <Button
              onPress={() => addToCart(item)}
              disabled={!item.stock}
              size="sm"
              style={{ marginTop: space.md }}
            >
              Add to cart
            </Button>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  cartButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontSize: 15,
    color: colors.ink,
  },
  categoriesScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoriesContent: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.md,
  },
  categoryChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryChipActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  productsContent: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: space.lg,
    gap: space.lg,
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  stockPill: {
    marginTop: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  stockAvailable: {
    backgroundColor: colors.status.success.bg,
  },
  stockUnavailable: {
    backgroundColor: colors.status.danger.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
    color: colors.ink,
    marginBottom: space.md,
    minHeight: 44,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  paymentOptionSelected: {
    borderColor: colors.pink,
    backgroundColor: '#FFF0F5',
  },
  paymentRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    marginRight: space.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.pink,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xl,
    marginBottom: space.xl,
  },
});
