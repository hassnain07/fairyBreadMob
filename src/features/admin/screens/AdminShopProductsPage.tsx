import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
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
import { Check, Edit3, Package, Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { AdminShopProduct, ShopProductInput } from '@/types/shop';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Workbooks', 'Flash Cards', 'Activity Kits'];

interface ProductFormState {
  title: string; category: string; description: string; details: string;
  price_cents: string; stock_quantity: string; low_stock_threshold: string;
  is_active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  title: '', category: CATEGORIES[0], description: '', details: '',
  price_cents: '', stock_quantity: '0', low_stock_threshold: '3', is_active: true,
};

function validate(f: ProductFormState): Partial<Record<keyof ProductFormState, string>> {
  const e: Partial<Record<keyof ProductFormState, string>> = {};
  if (!f.title.trim()) e.title = 'Title is required (max 200 chars).';
  const price = Number(f.price_cents);
  if (isNaN(price) || price < 0) e.price_cents = 'Enter a valid price in cents (e.g. 1800 for $18.00).';
  const stock = Number(f.stock_quantity);
  if (isNaN(stock) || stock < 0) e.stock_quantity = 'Stock must be 0 or more.';
  const threshold = Number(f.low_stock_threshold);
  if (isNaN(threshold) || threshold < 0) e.low_stock_threshold = 'Threshold must be 0 or more.';
  return e;
}

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  'In Stock':     { bg: colors.status.success.bg, fg: colors.status.success.fg },
  'Low Stock':    { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
  'Out of Stock': { bg: colors.status.danger.bg,  fg: colors.status.danger.fg  },
};

// ── Product form sheet ────────────────────────────────────────────────────────

function ProductFormSheet({ product, onClose }: { product?: AdminShopProduct; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(product ? {
    title:               product.title,
    category:            product.category,
    description:         product.description,
    details:             product.details,
    price_cents:         String(product.price_cents),
    stock_quantity:      String(product.stock_quantity),
    low_stock_threshold: String(product.low_stock_threshold),
    is_active:           product.is_active,
  } : EMPTY_FORM);
  const [errors,    setErrors]   = useState<Partial<Record<keyof ProductFormState, string>>>({});
  const [saveError, setSaveError] = useState('');

  function setF<K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => dataClient.upsertShopProduct({
      id:                  product?.id,
      title:               form.title.trim(),
      category:            form.category,
      description:         form.description.trim(),
      details:             form.details.trim(),
      price_cents:         Number(form.price_cents),
      stock_quantity:      Number(form.stock_quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
      is_active:           form.is_active,
    } as ShopProductInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminShopProducts });
      qc.invalidateQueries({ queryKey: qk.shopProducts });
      onClose();
    },
    onError: (e: any) => setSaveError(e?.message ?? 'Failed to save product.'),
  });

  function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaveError('');
    save();
  }

  return (
    <Pressable style={sty.backdrop} onPress={onClose}>
      <Pressable style={sty.sheet} onPress={e => e.stopPropagation()}>
        <View style={sty.sheetHandle} />
        <View style={sty.sheetHeader}>
          <Text style={sty.sheetTitle}>{product ? 'Edit product' : 'New product'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.md }}>
            {/* Title */}
            <View>
              <Text style={sty.fieldLabel}>Title</Text>
              <TextInput style={[sty.input, errors.title && sty.inputError]} value={form.title} onChangeText={v => setF('title', v)} placeholder="Product name" placeholderTextColor={colors.muted} maxLength={200} />
              {errors.title ? <Text style={sty.fieldError}>{errors.title}</Text> : null}
            </View>

            {/* Category */}
            <View>
              <Text style={sty.fieldLabel}>Category</Text>
              <View style={sty.categoryChips}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[sty.catChip, form.category === cat && sty.catChipActive]} onPress={() => setF('category', cat)} activeOpacity={0.75}>
                    <Text style={[sty.catChipText, form.category === cat && { color: colors.pink, fontWeight: '700' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View>
              <Text style={sty.fieldLabel}>Description (short)</Text>
              <TextInput style={sty.input} value={form.description} onChangeText={v => setF('description', v)} placeholder="e.g. A hands-on activity kit" placeholderTextColor={colors.muted} />
            </View>

            {/* Details */}
            <View>
              <Text style={sty.fieldLabel}>Details (long)</Text>
              <TextInput style={[sty.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 11 }]} value={form.details} onChangeText={v => setF('details', v)} placeholder="Full product description" placeholderTextColor={colors.muted} multiline />
            </View>

            {/* Numeric row */}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={sty.fieldLabel}>Price (cents)</Text>
                <TextInput style={[sty.input, errors.price_cents && sty.inputError]} value={form.price_cents} onChangeText={v => setF('price_cents', v)} placeholder="1800" placeholderTextColor={colors.muted} keyboardType="numeric" />
                {errors.price_cents ? <Text style={sty.fieldError}>{errors.price_cents}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.fieldLabel}>Stock qty</Text>
                <TextInput style={[sty.input, errors.stock_quantity && sty.inputError]} value={form.stock_quantity} onChangeText={v => setF('stock_quantity', v)} placeholder="0" placeholderTextColor={colors.muted} keyboardType="numeric" />
                {errors.stock_quantity ? <Text style={sty.fieldError}>{errors.stock_quantity}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.fieldLabel}>Low stock at</Text>
                <TextInput style={[sty.input, errors.low_stock_threshold && sty.inputError]} value={form.low_stock_threshold} onChangeText={v => setF('low_stock_threshold', v)} placeholder="3" placeholderTextColor={colors.muted} keyboardType="numeric" />
                {errors.low_stock_threshold ? <Text style={sty.fieldError}>{errors.low_stock_threshold}</Text> : null}
              </View>
            </View>

            {/* Active toggle */}
            <TouchableOpacity style={sty.checkRow} onPress={() => setF('is_active', !form.is_active)} activeOpacity={0.7}>
              <View style={[sty.checkbox, form.is_active && sty.checkboxActive]}>
                {form.is_active && <Check size={11} color="#fff" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sty.checkLabel}>Active (visible in shop)</Text>
                <Text style={sty.checkSub}>{form.is_active ? 'Visible to parents' : 'Hidden from shop'}</Text>
              </View>
            </TouchableOpacity>

            {saveError ? <View style={sty.errorBox}><Text style={sty.errorText}>{saveError}</Text></View> : null}

            <View style={sty.sheetFooter}>
              <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <Button label={saving ? 'Saving…' : 'Save product'} variant="primary" icon={Check} loading={saving} disabled={saving} onPress={handleSave} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onToggle }: {
  product: AdminShopProduct; onEdit: () => void; onToggle: () => void;
}) {
  const ss = STATUS_STYLE[product.status] ?? { bg: colors.surface, fg: colors.muted };

  return (
    <View style={[sty.productCard, shadow.card, !product.is_active && sty.productCardInactive]}>
      {/* Image or placeholder */}
      <View style={sty.productImageWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={sty.productImage} resizeMode="cover" />
        ) : (
          <View style={sty.productImagePlaceholder}>
            <Package size={20} color={colors.muted} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={sty.productInfo}>
        <View style={sty.productInfoTop}>
          <Text style={sty.productTitle} numberOfLines={2}>{product.title}</Text>
          <TouchableOpacity onPress={onEdit} hitSlop={10} style={sty.editBtn}>
            <Edit3 size={14} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <Text style={sty.productCategory}>{product.category}</Text>

        <View style={sty.productMetaRow}>
          <Text style={sty.productPrice}>{formatMoney(product.price_cents)}</Text>
          <Text style={sty.productStock}>Stock: {product.stock_quantity}</Text>
          <View style={[sty.statusBadge, { backgroundColor: ss.bg }]}>
            <Text style={[sty.statusText, { color: ss.fg }]}>{product.status}</Text>
          </View>
        </View>

        {/* Active toggle */}
        <TouchableOpacity style={sty.toggleRow} onPress={onToggle} activeOpacity={0.7}>
          <View style={[sty.toggleTrack, product.is_active && sty.toggleTrackOn]}>
            <View style={[sty.toggleThumb, product.is_active && sty.toggleThumbOn]} />
          </View>
          <Text style={sty.toggleLabel}>{product.is_active ? 'Active' : 'Inactive'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminShopProductsPage() {
  const qc = useQueryClient();
  const [editing,    setEditing]    = useState<AdminShopProduct | undefined>();
  const [showForm,   setShowForm]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: qk.adminShopProducts,
    queryFn:  () => dataClient.getAdminShopProducts(),
    staleTime: 60_000,
  });

  const { mutate: toggle } = useMutation({
    mutationFn: (p: AdminShopProduct) => dataClient.upsertShopProduct({ id: p.id, is_active: !p.is_active } as ShopProductInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminShopProducts });
      qc.invalidateQueries({ queryKey: qk.shopProducts });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.adminShopProducts });
    setRefreshing(false);
  };

  return (
    <View style={sty.root}>
      {/* Toolbar */}
      <View style={sty.toolbar}>
        <View style={sty.searchRow}>
          <TextInput style={sty.searchInput} placeholder="Search products…" value={search} onChangeText={setSearch} placeholderTextColor={colors.muted} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><X size={14} color={colors.muted} /></TouchableOpacity>}
        </View>
        <Button label="New product" variant="primary" icon={Plus} onPress={() => { setEditing(undefined); setShowForm(true); }} />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={sty.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={100} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onEdit={() => { setEditing(item); setShowForm(true); }}
              onToggle={() => toggle(item)}
            />
          )}
          contentContainerStyle={sty.listContent}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={sty.emptyCard}>
              <Package size={28} color={colors.muted} />
              <Text style={[type.h3, { color: colors.ink, marginTop: space.md }]}>No products yet</Text>
              <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.sm, marginBottom: space.lg }]}>
                Add your first product above.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Form sheet */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <ProductFormSheet product={editing} onClose={() => { setShowForm(false); setEditing(undefined); }} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sty = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  toolbar: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, gap: space.sm, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  listContent: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.huge },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.xl, alignItems: 'center' },

  // product card
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    minHeight: 100,
  },
  productCardInactive: { opacity: 0.6 },
  productImageWrap: {
    width: 90,
    height: 100,
    flexShrink: 0,
    backgroundColor: colors.surface,
  },
  productImage: {
    width: 90,
    height: 100,
  },
  productImagePlaceholder: {
    width: 90,
    height: 100,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1, padding: space.md, gap: space.xs, justifyContent: 'center' },
  productInfoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  productTitle: { flex: 1, fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink, lineHeight: 18 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, flexShrink: 0 },
  productCategory: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.mutedSoft },
  productMetaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  productPrice: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.ink },
  productStock: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, backgroundColor: colors.line, padding: 2, justifyContent: 'flex-start' },
  toggleTrackOn: { backgroundColor: colors.pink },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.muted },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '94%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },

  // form
  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  fieldError: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.error.fg, marginTop: 3 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 15, color: colors.ink, minHeight: 46 },
  inputError: { borderColor: colors.error.fg },
  categoryChips: { flexDirection: 'row', gap: space.sm },
  catChip: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  catChipActive: { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
  catChipText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  checkboxActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  checkLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink },
  checkSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md },
});
