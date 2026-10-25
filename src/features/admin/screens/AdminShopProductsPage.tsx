import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, ScrollView, TextInput, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

interface ShopProduct {
  id: string;
  title: string;
  category: string;
  description: string;
  price_cents: number;
  stock_quantity: number;
  is_active: boolean;
  image_path?: string;
}

const CATEGORIES = ['Workbooks', 'Flash Cards', 'Activity Kits'];

interface ProductFormState {
  title: string;
  category: string;
  description: string;
  price_cents: string;
  stock_quantity: string;
  is_active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  title: '',
  category: CATEGORIES[0],
  description: '',
  price_cents: '',
  stock_quantity: '0',
  is_active: true,
};

function validate(f: ProductFormState): Partial<Record<keyof ProductFormState, string>> {
  const e: Partial<Record<keyof ProductFormState, string>> = {};
  if (!f.title.trim()) e.title = 'Title is required.';
  const price = Number(f.price_cents);
  if (isNaN(price) || price < 0) e.price_cents = 'Enter a valid price in cents.';
  const stock = Number(f.stock_quantity);
  if (isNaN(stock) || stock < 0) e.stock_quantity = 'Stock must be 0 or more.';
  return e;
}

function ProductModal({ product, onClose }: { product?: ShopProduct; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(
    product
      ? {
          title: product.title,
          category: product.category,
          description: product.description,
          price_cents: String(product.price_cents),
          stock_quantity: String(product.stock_quantity),
          is_active: product.is_active,
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormState, string>>>({});
  const [pendingImage, setPendingImage] = useState<{ uri: string; type: string } | null>(null);
  const [imgError, setImgError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async (input: any) => {
      const productId = input.id ?? `${Date.now()}`;
      let imagePath: string | undefined;
      if (pendingImage) {
        imagePath = await dataClient.uploadShopProductImage?.(productId, {
          uri: pendingImage.uri,
          name: `product-${productId}.jpg`,
          type: pendingImage.type,
        }) || undefined;
      }
      return dataClient.upsertShopProduct?.({
        ...input,
        id: productId,
        ...(imagePath !== undefined ? { image_path: imagePath } : {}),
      }) || Promise.resolve(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-products'] });
      onClose();
    },
  });

  async function handleImagePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setImgError('Image must be under 5 MB.');
        return;
      }
      setImgError('');
      setPendingImage({ uri: asset.uri, type: asset.type ?? 'image/jpeg' });
    }
  }

  function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    saveMutation.mutate({
      id: product?.id,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      price_cents: Number(form.price_cents),
      stock_quantity: Number(form.stock_quantity),
      is_active: form.is_active,
    });
  }

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, shadow.sheet as object]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h3, { color: colors.ink, flex: 1 }]}>
              {product ? 'Edit product' : 'New product'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Image */}
            <TouchableOpacity style={styles.imageBox} onPress={handleImagePick}>
              {pendingImage ? (
                <Text style={[type.body, { color: colors.ink }]}>📸 Image selected</Text>
              ) : (
                <>
                  <ImageIcon size={32} color={colors.muted} />
                  <Text style={[type.small, { color: colors.muted, marginTop: space.sm }]}>Tap to select image</Text>
                </>
              )}
            </TouchableOpacity>
            {imgError && <Text style={[type.small, { color: colors.status.danger.fg, marginTop: space.sm }]}>{imgError}</Text>}

            {/* Form fields */}
            <View style={{ gap: space.md, marginTop: space.lg }}>
              <View>
                <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
                  Title
                </Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="Product name"
                  value={form.title}
                  onChangeText={v => setForm({ ...form, title: v })}
                  placeholderTextColor={colors.muted}
                />
                {errors.title && <Text style={[type.small, { color: colors.status.danger.fg, marginTop: space.xs }]}>{errors.title}</Text>}
              </View>

              <View>
                <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
                  Category
                </Text>
                <View style={styles.categoryChips}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        form.category === cat && { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
                      ]}
                      onPress={() => setForm({ ...form, category: cat })}
                    >
                      <Text style={[type.small, { color: form.category === cat ? colors.pink : colors.ink }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Product description"
                  value={form.description}
                  onChangeText={v => setForm({ ...form, description: v })}
                  placeholderTextColor={colors.muted}
                  multiline
                />
              </View>

              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
                    Price (cents)
                  </Text>
                  <TextInput
                    style={[styles.input, errors.price_cents && styles.inputError]}
                    placeholder="1800"
                    value={form.price_cents}
                    onChangeText={v => setForm({ ...form, price_cents: v })}
                    keyboardType="numeric"
                    placeholderTextColor={colors.muted}
                  />
                  {errors.price_cents && (
                    <Text style={[type.small, { color: colors.status.danger.fg, marginTop: space.xs }]}>
                      {errors.price_cents}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
                    Stock
                  </Text>
                  <TextInput
                    style={[styles.input, errors.stock_quantity && styles.inputError]}
                    placeholder="0"
                    value={form.stock_quantity}
                    onChangeText={v => setForm({ ...form, stock_quantity: v })}
                    keyboardType="numeric"
                    placeholderTextColor={colors.muted}
                  />
                  {errors.stock_quantity && (
                    <Text style={[type.small, { color: colors.status.danger.fg, marginTop: space.xs }]}>
                      {errors.stock_quantity}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md }}>
                <Text style={[type.body, { color: colors.ink }]}>Active</Text>
                <Switch value={form.is_active} onValueChange={v => setForm({ ...form, is_active: v })} />
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: space.md, marginTop: space.lg, marginBottom: space.xl }}>
              <Button
                label={saveMutation.isPending ? 'Saving...' : 'Save product'}
                variant="primary"
                onPress={handleSave}
              />
              <Button label="Cancel" variant="secondary" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function AdminShopProductsPage() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ShopProduct | undefined>();

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['shop-products'],
    queryFn: () => dataClient.getShopProducts?.() || Promise.resolve([]),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openNewModal = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };

  const openEditModal = (product: ShopProduct) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const renderProduct = ({ item }: { item: ShopProduct }) => (
    <TouchableOpacity
      style={[styles.productCard, shadow.card as object]}
      onPress={() => openEditModal(item)}
    >
      <View style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>{item.title}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{item.category}</Text>
          </View>
          <View style={{ backgroundColor: item.is_active ? colors.status.success.bg : colors.status.danger.bg, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill }}>
            <Text style={[type.pill, { color: item.is_active ? colors.status.success.fg : colors.status.danger.fg }]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={[type.small, { color: colors.muted, marginTop: space.sm }]}>
          ${(item.price_cents / 100).toFixed(2)} • Stock: {item.stock_quantity}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.contentPadding}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.lg }}>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>Shop Products</Text>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Manage the product catalogue, stock and images.
            </Text>
            <Button label="+ Add product" variant="primary" onPress={openNewModal} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyBox}>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>No products yet.</Text>
            </View>
          )
        }
      />
      {modalOpen && <ProductModal product={editingProduct} onClose={() => setModalOpen(false)} />}
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
  productCard: {
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
    maxHeight: '90%',
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
  imageBox: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChips: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.status.danger.fg,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: space.md,
  },
});
