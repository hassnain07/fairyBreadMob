import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { dataClient } from '@/lib/data/client';
import type { ShopProduct, ShopCartItem } from '@/types/shop';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Workbooks', 'Flash Cards', 'Activity Kits'];

// Fallback color palette when no image_url exists (matches web IMG_COLORS)
const IMG_BG: { bg: string; fg: string }[] = [
  { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg    },
  { bg: colors.tealSoft,   fg: colors.avatar.teal.fg    },
  { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg  },
  { bg: colors.orangeSoft, fg: colors.avatar.orange.fg  },
  { bg: colors.greenSoft,  fg: colors.avatar.green.fg   },
];

function imgColors(index: number) {
  return IMG_BG[index % IMG_BG.length];
}

function productInitials(title: string) {
  return title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function newId() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ShopProduct['status'] }) {
  const map = {
    'In Stock':     { bg: colors.status.success.bg, fg: colors.status.success.fg },
    'Low Stock':    { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
    'Out of Stock': { bg: colors.status.danger.bg,  fg: colors.status.danger.fg  },
  };
  const { bg, fg } = map[status] ?? map['In Stock'];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[type.caption, { color: fg, fontWeight: '600' }]}>{status}</Text>
    </View>
  );
}

// ── Product image ─────────────────────────────────────────────────────────────

function ProductImage({ product, index, size = 'card' }: { product: ShopProduct; index: number; size?: 'card' | 'detail' }) {
  const dim = size === 'detail' ? styles.detailImage : styles.cardImage;
  if (product.image_url) {
    return <Image source={{ uri: product.image_url }} style={dim} resizeMode="cover" />;
  }
  const { bg, fg } = imgColors(index);
  return (
    <View style={[dim, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size === 'detail' ? 36 : 22, fontWeight: '700', color: fg }}>
        {productInitials(product.title)}
      </Text>
    </View>
  );
}

// ── Qty stepper ───────────────────────────────────────────────────────────────

function QtyStepper({ qty, onDec, onInc, small }: { qty: number; onDec: () => void; onInc: () => void; small?: boolean }) {
  const sz = small ? 30 : 36;
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={[styles.stepBtn, { width: sz, height: sz }]} onPress={onDec}>
        <Minus size={small ? 13 : 15} color={colors.ink} />
      </TouchableOpacity>
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', minWidth: 24, textAlign: 'center' }]}>{qty}</Text>
      <TouchableOpacity style={[styles.stepBtn, { width: sz, height: sz }]} onPress={onInc}>
        <Plus size={small ? 13 : 15} color={colors.ink} />
      </TouchableOpacity>
    </View>
  );
}

// ── Product detail sheet ──────────────────────────────────────────────────────

interface ProductSheetProps {
  product: ShopProduct;
  index: number;
  cartQty: number;
  onAdd: (p: ShopProduct, qty: number) => void;
  onClose: () => void;
}

function ProductSheet({ product, index, cartQty, onAdd, onClose }: ProductSheetProps) {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState(1);
  const outOfStock = product.status === 'Out of Stock';

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product image */}
          <ProductImage product={product} index={index} size="detail" />

          {/* Meta */}
          <View style={styles.detailMeta}>
            <View style={styles.detailBadgeRow}>
              <View style={styles.categoryPill}>
                <Text style={[type.caption, { color: colors.muted, fontWeight: '600' }]}>{product.category}</Text>
              </View>
              <StatusBadge status={product.status} />
            </View>

            <Text style={[type.h2, { color: colors.ink, marginTop: space.sm }]}>{product.title}</Text>
            <Text style={[type.small, { color: colors.muted, marginTop: space.sm, lineHeight: 20 }]}>{product.details || product.description}</Text>

            <Text style={[type.h2, { color: colors.pink, marginTop: space.lg }]}>{formatMoney(product.price_cents)}</Text>
          </View>

          {/* Add to cart */}
          {outOfStock ? (
            <View style={styles.outOfStockNote}>
              <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>This item is currently out of stock.</Text>
            </View>
          ) : (
            <View style={styles.detailActions}>
              <QtyStepper qty={qty} onDec={() => setQty(q => Math.max(1, q - 1))} onInc={() => setQty(q => q + 1)} />
              <Button
                label={cartQty > 0 ? `Add more (${cartQty} in cart)` : 'Add to cart'}
                variant="primary"
                icon={ShoppingBag}
                onPress={() => { onAdd(product, qty); onClose(); }}
                style={{ flex: 1 }}
              />
            </View>
          )}

          <View style={{ height: space.lg }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Checkout types ────────────────────────────────────────────────────────────

type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'proof';

interface DeliveryForm { name: string; address: string; phone: string; email: string; }
const EMPTY_DELIVERY: DeliveryForm = { name: '', address: '', phone: '', email: '' };

// ── Checkout sheet ────────────────────────────────────────────────────────────

interface CheckoutSheetProps {
  cart: ShopCartItem[];
  familyId: string | null;
  settings: any;
  family: any;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onSuccess: (orderNumber: string) => void;
  onClose: () => void;
}

function CheckoutSheet({
  cart, familyId, settings, family,
  onUpdateQty, onRemove, onSuccess, onClose,
}: CheckoutSheetProps) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const orderIdRef = useRef(newId());

  const [step, setStep]                   = useState<CheckoutStep>('cart');
  const [delivery, setDelivery]           = useState<DeliveryForm>(EMPTY_DELIVERY);
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<DeliveryForm>>({});
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'advance'>('cod');
  const [proofFile, setProofFile]         = useState<ProofFile | null>(null);
  const [mutError, setMutError]           = useState<string | null>(null);

  const total = cart.reduce((s, i) => s + i.product.price_cents * i.quantity, 0);
  const bank     = (settings as any)?.public_info?.bank ?? {};
  const refCode  = family?.reference_code ?? (familyId ?? '').toUpperCase();
  const reference = `${refCode}-SHOP`;

  const STEP_ORDER: CheckoutStep[] = ['cart', 'delivery', 'payment', 'proof'];
  const STEP_LABELS: Record<CheckoutStep, string> = {
    cart: 'Review cart', delivery: 'Delivery details', payment: 'Payment method', proof: 'Upload receipt',
  };
  const visibleSteps = STEP_ORDER.filter(s => s !== 'proof' || paymentMethod === 'advance');
  const stepIdx = visibleSteps.indexOf(step);

  const place = useMutation({
    mutationFn: async () => {
      let receiptFile: File | null = null;
      if (paymentMethod === 'advance') {
        if (!proofFile) throw new Error('Please upload your payment receipt.');
        const blob = await (await fetch(proofFile.uri)).blob();
        receiptFile = new File([blob], proofFile.name, { type: blob.type || 'application/octet-stream' });
      }
      return dataClient.placeOrder({
        orderId:       orderIdRef.current,
        source:        'portal',
        items:         cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        paymentMethod,
        delivery,
        receipt:       receiptFile,
        familyId:      familyId ?? '',
      } as any);
    },
    onSuccess: (placed) => {
      qc.invalidateQueries({ queryKey: ['shop-orders', familyId] });
      qc.invalidateQueries({ queryKey: ['shopProducts'] });
      onSuccess(placed.order_number);
    },
    onError: (e: any) => setMutError(e?.message ?? 'Failed to place order. Please try again.'),
  });

  function validateDelivery() {
    const e: Partial<DeliveryForm> = {};
    if (!delivery.name.trim())    e.name    = 'Full name is required.';
    if (!delivery.address.trim()) e.address = 'Delivery address is required.';
    if (!delivery.phone.trim())   e.phone   = 'Phone number is required.';
    return e;
  }

  function setField(k: keyof DeliveryForm, v: string) {
    setDelivery(d => ({ ...d, [k]: v }));
    setDeliveryErrors(e => ({ ...e, [k]: undefined }));
  }

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable
        style={[styles.sheet, styles.checkoutSheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}
        onPress={e => e.stopPropagation()}
      >
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.checkoutHeader}>
          <Text style={[type.h3, { color: colors.ink }]}>{STEP_LABELS[step]}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {visibleSteps.map((s, i) => (
            <View key={s} style={[styles.stepDot, i <= stepIdx && styles.stepDotActive]} />
          ))}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Cart ─────────────────────────────────────────── */}
            {step === 'cart' && (
              <>
                {cart.length === 0 ? (
                  <View style={styles.cartEmpty}>
                    <ShoppingBag size={32} color={colors.muted} />
                    <Text style={[type.small, { color: colors.muted, marginTop: space.md }]}>Your cart is empty.</Text>
                  </View>
                ) : (
                  <>
                    {cart.map(item => (
                      <View key={item.product.id} style={styles.cartRow}>
                        <View style={styles.cartRowInfo}>
                          <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]} numberOfLines={2}>{item.product.title}</Text>
                          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{formatMoney(item.product.price_cents)} each</Text>
                        </View>
                        <QtyStepper
                          qty={item.quantity}
                          onDec={() => onUpdateQty(item.product.id, item.quantity - 1)}
                          onInc={() => onUpdateQty(item.product.id, item.quantity + 1)}
                          small
                        />
                        <Text style={[type.small, { color: colors.ink, fontWeight: '600', minWidth: 52, textAlign: 'right' }]}>
                          {formatMoney(item.product.price_cents * item.quantity)}
                        </Text>
                        <TouchableOpacity onPress={() => onRemove(item.product.id)} hitSlop={8}>
                          <X size={15} color={colors.muted} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.cartTotal}>
                      <Text style={[type.bodyStrong, { color: colors.ink }]}>Total</Text>
                      <Text style={[type.h2, { color: colors.pink }]}>{formatMoney(total)}</Text>
                    </View>

                    <View style={styles.checkoutFooter}>
                      <Button label="Continue" variant="primary" icon={ArrowRight} onPress={() => setStep('delivery')} fullWidth />
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── Delivery ─────────────────────────────────────── */}
            {step === 'delivery' && (
              <>
                {(
                  [
                    { key: 'name',    label: 'Full name',          placeholder: 'Jane Smith',        kbd: 'default'      },
                    { key: 'address', label: 'Delivery address',   placeholder: '12 Baker St, Sydney', kbd: 'default'    },
                    { key: 'phone',   label: 'Phone number',        placeholder: '04xx xxx xxx',      kbd: 'phone-pad'    },
                  ] as const
                ).map(({ key, label, placeholder, kbd }) => (
                  <View key={key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{label} <Text style={{ color: colors.pink }}>*</Text></Text>
                    <TextInput
                      style={[styles.input, deliveryErrors[key] && styles.inputError]}
                      value={delivery[key]}
                      onChangeText={v => setField(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor={colors.muted}
                      keyboardType={kbd as any}
                    />
                    {deliveryErrors[key] && (
                      <Text style={styles.fieldError}>{deliveryErrors[key]}</Text>
                    )}
                  </View>
                ))}
                <View style={styles.checkoutFooter}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('cart')} style={{ flex: 1 }} />
                  <Button
                    label="Continue"
                    variant="primary"
                    icon={ArrowRight}
                    onPress={() => {
                      const errs = validateDelivery();
                      if (Object.keys(errs).length) { setDeliveryErrors(errs); return; }
                      setDeliveryErrors({});
                      setStep('payment');
                    }}
                    style={{ flex: 2 }}
                  />
                </View>
              </>
            )}

            {/* ── Payment ──────────────────────────────────────── */}
            {step === 'payment' && (
              <>
                {(
                  [
                    { key: 'cod',     emoji: '🚚', title: 'Cash on delivery',  desc: 'Pay when your order arrives' },
                    { key: 'advance', emoji: '🏦', title: 'Bank transfer',      desc: 'Upload your receipt after paying' },
                  ] as const
                ).map(({ key, emoji, title, desc }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.paymentOption, paymentMethod === key && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.paymentEmoji}>{emoji}</Text>
                    <View style={styles.paymentTextWrap}>
                      <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>{title}</Text>
                      <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{desc}</Text>
                    </View>
                    {paymentMethod === key && (
                      <View style={styles.paymentCheck}>
                        <Check size={13} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {mutError && (
                  <View style={styles.errorBox}>
                    <Text style={[type.small, { color: colors.error.fg }]}>{mutError}</Text>
                  </View>
                )}

                <View style={styles.checkoutFooter}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('delivery')} style={{ flex: 1 }} />
                  <Button
                    label={paymentMethod === 'cod' ? (place.isPending ? 'Placing…' : 'Place order') : 'Continue'}
                    variant="primary"
                    icon={paymentMethod === 'advance' ? ArrowRight : undefined}
                    loading={place.isPending}
                    disabled={place.isPending}
                    onPress={() => {
                      setMutError(null);
                      if (paymentMethod === 'cod') place.mutate();
                      else setStep('proof');
                    }}
                    style={{ flex: 2 }}
                  />
                </View>
              </>
            )}

            {/* ── Proof ────────────────────────────────────────── */}
            {step === 'proof' && (
              <>
                {/* Bank details */}
                {(bank.bsb || bank.account) && (
                  <View style={styles.bankBox}>
                    <Text style={[type.eyebrow, { color: colors.teal, marginBottom: space.sm }]}>Bank transfer details</Text>
                    {bank.account_name && <View style={styles.bankRow}><Text style={styles.bankLabel}>Account name</Text><Text style={styles.bankValue}>{bank.account_name}</Text></View>}
                    {bank.bsb         && <View style={styles.bankRow}><Text style={styles.bankLabel}>BSB</Text><Text style={styles.bankValue}>{bank.bsb}</Text></View>}
                    {bank.account     && <View style={styles.bankRow}><Text style={styles.bankLabel}>Account</Text><Text style={styles.bankValue}>{bank.account}</Text></View>}
                    <View style={styles.bankRow}><Text style={styles.bankLabel}>Reference</Text><Text style={styles.bankValue}>{reference}</Text></View>
                  </View>
                )}

                <ProofPicker
                  onSelect={f => setProofFile(f ?? null)}
                  selectedFile={proofFile ?? undefined}
                  prompt="Upload your payment receipt"
                  helper="A screenshot or PDF of your bank transfer confirmation."
                  maxSizeMB={10}
                  disabled={place.isPending}
                />

                {mutError && (
                  <View style={styles.errorBox}>
                    <Text style={[type.small, { color: colors.error.fg }]}>{mutError}</Text>
                  </View>
                )}

                <View style={styles.checkoutFooter}>
                  <Button label="Back" variant="ghost" onPress={() => setStep('payment')} style={{ flex: 1 }} />
                  <Button
                    label={place.isPending ? 'Placing…' : 'Place order'}
                    variant="primary"
                    loading={place.isPending}
                    disabled={!proofFile || place.isPending}
                    onPress={() => { setMutError(null); place.mutate(); }}
                    style={{ flex: 2 }}
                  />
                </View>
              </>
            )}

            <View style={{ height: space.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </Pressable>
  );
}

// ── Product card (grid item) ──────────────────────────────────────────────────

interface ProductCardProps {
  product: ShopProduct;
  index: number;
  cartQty: number;
  onPress: () => void;
  onAdd: () => void;
}

function ProductCard({ product, index, cartQty, onPress, onAdd }: ProductCardProps) {
  const outOfStock = product.status === 'Out of Stock';
  return (
    <TouchableOpacity style={[styles.productCard, shadow.card]} onPress={onPress} activeOpacity={0.85}>
      <ProductImage product={product} index={index} />

      <View style={styles.productCardBody}>
        <View style={styles.productCardBadgeRow}>
          <View style={styles.categoryPill}>
            <Text style={[type.caption, { color: colors.muted, fontWeight: '600' }]}>{product.category}</Text>
          </View>
          <StatusBadge status={product.status} />
        </View>

        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]} numberOfLines={2}>{product.description}</Text>

        <View style={styles.productCardFooter}>
          <Text style={[type.h3, { color: colors.pink }]}>{formatMoney(product.price_cents)}</Text>
          {outOfStock ? (
            <Text style={[type.caption, { color: colors.muted }]}>Out of stock</Text>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, cartQty > 0 && styles.addBtnActive]}
              onPress={e => { e.stopPropagation?.(); onAdd(); }}
              activeOpacity={0.75}
            >
              {cartQty > 0
                ? <Text style={[type.caption, { color: colors.teal, fontWeight: '700' }]}>In cart ({cartQty})</Text>
                : <><Plus size={13} color={colors.pink} /><Text style={[type.caption, { color: colors.pink, fontWeight: '700', marginLeft: 3 }]}>Add</Text></>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function LearningShopPage() {
  const { familyId } = useAuth();
  const insets = useSafeAreaInsets();

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');
  const [cart,     setCart]     = useState<ShopCartItem[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<{ product: ShopProduct; index: number } | null>(null);
  const [checkoutOpen, setCheckoutOpen]       = useState(false);
  const [successMsg,   setSuccessMsg]         = useState('');

  // Queries
  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['shopProducts'],
    queryFn:  () => dataClient.getShopProducts(),
    staleTime: 5 * 60_000,
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => dataClient.getSettings(),
    staleTime: 10 * 60_000,
  });

  const { data: family } = useQuery({
    queryKey: ['family', familyId],
    queryFn:  () => dataClient.getFamily(familyId!),
    enabled:  !!familyId,
    staleTime: 5 * 60_000,
  });

  // Filtering
  const filtered = useMemo(() => products.filter(p => {
    const matchCat    = category === 'All' || p.category === category;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [products, category, search]);

  // Cart helpers
  const maxQty = (settings as any)?.shop?.max_qty_per_line ?? 10;

  const addToCart = useCallback((product: ShopProduct, qty = 1) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id);
      if (existing) {
        return c.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + qty, maxQty) }
            : i
        );
      }
      return [...c, { product, quantity: Math.min(qty, maxQty) }];
    });
  }, [maxQty]);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) { setCart(c => c.filter(i => i.product.id !== productId)); return; }
    setCart(c => c.map(i =>
      i.product.id === productId ? { ...i, quantity: Math.min(qty, maxQty) } : i
    ));
  }, [maxQty]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(c => c.filter(i => i.product.id !== productId));
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleOrderSuccess = useCallback((orderNumber: string) => {
    setCart([]);
    setCheckoutOpen(false);
    setSuccessMsg(`Order ${orderNumber} placed! We'll be in touch soon.`);
    setTimeout(() => setSuccessMsg(''), 7000);
  }, []);

  // ── Render product item ──────────────────────────────────────────────────
  const renderProduct = useCallback(({ item, index }: { item: ShopProduct; index: number }) => {
    const cartQty = cart.find(c => c.product.id === item.id)?.quantity ?? 0;
    return (
      <ProductCard
        product={item}
        index={index}
        cartQty={cartQty}
        onPress={() => setSelectedProduct({ product: item, index })}
        onAdd={() => addToCart(item)}
      />
    );
  }, [cart, addToCart]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Top bar ──────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={[type.eyebrow, { color: colors.pink }]}>Browse & shop</Text>
          <Text style={[type.h2, { color: colors.ink }]}>Learning Shop</Text>
        </View>

        {/* Cart button */}
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => setCheckoutOpen(true)}
          activeOpacity={0.75}
        >
          <ShoppingBag size={20} color={cartCount > 0 ? colors.pink : colors.muted} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
          <Text style={[type.small, { color: cartCount > 0 ? colors.pink : colors.muted, fontWeight: '600' }]}>Cart</Text>
        </TouchableOpacity>
      </View>

      {/* ── Success banner ────────────────────────────────── */}
      {successMsg !== '' && (
        <View style={styles.successBanner}>
          <Check size={14} color={colors.status.success.fg} />
          <Text style={[type.small, { color: colors.status.success.fg, flex: 1, marginLeft: space.sm }]}>{successMsg}</Text>
        </View>
      )}

      {/* ── Search + filters ──────────────────────────────── */}
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[type.caption, { color: category === cat ? '#fff' : colors.muted, fontWeight: '600' }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Product grid ──────────────────────────────────── */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.gridContent}>
          <View style={styles.gridRow}>
            <Skeleton height={220} borderRadius={radius.card} style={{ flex: 1 }} />
            <Skeleton height={220} borderRadius={radius.card} style={{ flex: 1 }} />
          </View>
          <View style={styles.gridRow}>
            <Skeleton height={220} borderRadius={radius.card} style={{ flex: 1 }} />
            <Skeleton height={220} borderRadius={radius.card} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>Failed to load products.</Text>
          <Button label="Try again" variant="soft" onPress={() => refetch()} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerState}>
          <ShoppingBag size={32} color={colors.muted} />
          <Text style={[type.small, { color: colors.muted, marginTop: space.md }]}>No products match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          numColumns={2}
          renderItem={renderProduct}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
        />
      )}

      {/* ── Product detail sheet ──────────────────────────── */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <ProductSheet
            product={selectedProduct.product}
            index={selectedProduct.index}
            cartQty={cart.find(c => c.product.id === selectedProduct.product.id)?.quantity ?? 0}
            onAdd={addToCart}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </Modal>

      {/* ── Checkout sheet ────────────────────────────────── */}
      <Modal
        visible={checkoutOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <CheckoutSheet
          cart={cart}
          familyId={familyId}
          settings={settings}
          family={family}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onSuccess={handleOrderSuccess}
          onClose={() => setCheckoutOpen(false)}
        />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // top bar
  topBar: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: space.lg,
    paddingVertical:   space.md,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cartBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.sm,
    position:       'relative',
    backgroundColor: colors.surface,
    borderRadius:   radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth:    1,
    borderColor:    colors.line,
  },
  cartBadge: {
    position:        'absolute',
    top:             -6,
    right:           -6,
    backgroundColor: colors.pink,
    borderRadius:    10,
    minWidth:        18,
    height:          18,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
    borderWidth:     2,
    borderColor:     colors.card,
  },
  cartBadgeText: {
    fontSize:   10,
    fontWeight: '700',
    color:      '#fff',
  },

  // success banner
  successBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.status.success.bg,
    paddingHorizontal: space.lg,
    paddingVertical:   space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  // toolbar
  toolbar: {
    backgroundColor:   colors.card,
    paddingHorizontal: space.lg,
    paddingTop:        space.sm,
    paddingBottom:     space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap:               space.sm,
  },
  searchRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.surface,
    borderRadius:      radius.md,
    paddingHorizontal: space.md,
    borderWidth:       1,
    borderColor:       colors.line,
    gap:               space.sm,
    minHeight:         40,
  },
  searchInput: {
    flex:      1,
    fontSize:  14,
    color:     colors.ink,
    paddingVertical: space.sm,
  },
  catRow: {
    gap: space.sm,
    paddingRight: space.sm,
  },
  catChip: {
    paddingHorizontal: space.md,
    paddingVertical:   space.xs,
    borderRadius:      radius.pill,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.line,
  },
  catChipActive: {
    backgroundColor: colors.pink,
    borderColor:     colors.pink,
  },

  // product grid
  gridContent: {
    padding:    space.md,
    gap:        space.md,
    flexGrow:   1,
  },
  gridRow: {
    gap: space.md,
  },

  // product card
  productCard: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.line,
  },
  cardImage: {
    width:       '100%',
    aspectRatio: 1.4,
    borderRadius:   0,
  },
  productCardBody: {
    padding: space.md,
    gap:     4,
  },
  productCardBadgeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    flexWrap:       'wrap',
    gap:            space.xs,
    marginBottom:   4,
  },
  productTitle: {
    fontSize:   13,
    fontWeight: '700',
    color:      colors.ink,
    lineHeight: 18,
  },
  productCardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      space.sm,
  },
  addBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.pinkSoft,
    borderRadius:      radius.pill,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       colors.pink,
  },
  addBtnActive: {
    backgroundColor: colors.tealSoft,
    borderColor:     colors.teal,
  },

  // status + category badges
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.pill,
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.pill,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.line,
  },

  // product detail sheet
  detailImage: {
    width:       '100%',
    aspectRatio: 1.6,
  },
  detailMeta: {
    padding: space.lg,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space.sm,
  },
  detailActions: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               space.md,
    paddingHorizontal: space.lg,
    paddingTop:        space.md,
  },
  outOfStockNote: {
    backgroundColor: colors.surface,
    margin:          space.lg,
    borderRadius:    radius.md,
    padding:         space.md,
  },

  // qty stepper
  stepper: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.sm,
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        4,
    borderWidth:    1,
    borderColor:    colors.line,
  },
  stepBtn: {
    borderRadius:   radius.sm,
    backgroundColor: colors.card,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    borderColor:    colors.line,
  },

  // shared sheet
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:    colors.paper,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:          '92%',
    paddingTop:         space.sm,
  },
  sheetHandle: {
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.line,
    alignSelf:       'center',
    marginBottom:    space.md,
  },

  // checkout sheet
  checkoutSheet: {
    paddingHorizontal: space.lg,
    maxHeight:         '96%',
  },
  checkoutHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   space.md,
  },
  stepDots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            space.sm,
    marginBottom:   space.lg,
  },
  stepDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.line,
  },
  stepDotActive: {
    backgroundColor: colors.teal,
  },

  // cart rows
  cartRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.sm,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cartRowInfo: {
    flex:    1,
    minWidth: 0,
  },
  cartTotal: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: space.lg,
    borderTopWidth:  1,
    borderTopColor:  colors.line,
    marginTop:       space.sm,
  },
  cartEmpty: {
    alignItems:    'center',
    paddingVertical: space.huge,
    gap:           space.md,
  },

  // delivery fields
  field: {
    marginBottom: space.md,
  },
  fieldLabel: {
    fontSize:     12,
    fontWeight:   '600',
    color:        colors.ink,
    marginBottom: 5,
  },
  input: {
    backgroundColor:   colors.surface,
    borderRadius:      radius.md,
    paddingHorizontal: space.md,
    paddingVertical:   Platform.OS === 'ios' ? 11 : space.sm,
    fontSize:          15,
    color:             colors.ink,
    borderWidth:       1,
    borderColor:       colors.line,
    minHeight:         44,
  },
  inputError: {
    borderColor: colors.error.fg,
  },
  fieldError: {
    fontSize:  11,
    color:     colors.error.fg,
    marginTop: 3,
  },

  // payment options
  paymentOption: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: colors.card,
    borderRadius:   radius.card,
    padding:        space.lg,
    marginBottom:   space.md,
    borderWidth:    2,
    borderColor:    colors.line,
    gap:            space.md,
  },
  paymentOptionActive: {
    borderColor:     colors.teal,
    backgroundColor: colors.tealSoft,
  },
  paymentEmoji: {
    fontSize: 22,
  },
  paymentTextWrap: { flex: 1 },
  paymentCheck: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: colors.teal,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // bank details
  bankBox: {
    backgroundColor: colors.bank?.bg ?? colors.surface,
    borderRadius:    radius.md,
    padding:         space.lg,
    marginBottom:    space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
  },
  bankRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  bankLabel: {
    fontSize: 12,
    color:    colors.muted,
  },
  bankValue: {
    fontSize:   12,
    fontWeight: '600',
    color:      colors.ink,
  },

  // error + footer
  errorBox: {
    backgroundColor: colors.error.bg,
    borderRadius:    radius.md,
    padding:         space.md,
    marginBottom:    space.md,
    borderWidth:     1,
    borderColor:     colors.error.border,
  },
  checkoutFooter: {
    flexDirection: 'row',
    gap:           space.md,
    paddingTop:    space.lg,
  },

  // empty / loading states
  centerState: {
    flex:          1,
    alignItems:    'center',
    justifyContent:'center',
    gap:           space.md,
    padding:       space.xl,
  },
});
