import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, type, space, radius, shadow } from '@/theme';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

const NOTIFICATION_CATEGORIES = [
  { key: 'new_bookings', label: 'New bookings' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'payments', label: 'Payment activity' },
  { key: 'reports', label: 'Weekly report summary' },
  { key: 'reminders', label: 'Session reminders' },
  { key: 'orders', label: 'Shop orders' },
] as const;

const DOCUMENTS = [
  { key: 'terms', label: 'Terms & Conditions', hint: 'Shown during enrolment.' },
  { key: 'privacy', label: 'Privacy Policy', hint: 'Accessible from enrolment form.' },
  { key: 'mini_trampoline', label: 'Mini Trampoline Consent Form', hint: 'Shown during enrolment.' },
] as const;

type DocKey = typeof DOCUMENTS[number]['key'];

function DocumentRow({ docKey, label, hint }: { docKey: DocKey; label: string; hint: string }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) {
        alert('File must be under 10 MB.');
        return;
      }

      setUploading(true);
      try {
        await dataClient.uploadDocument?.(docKey, {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
          size: file.size,
        });
        qc.invalidateQueries({ queryKey: ['settings', 'documents'] });
      } catch (err) {
        alert('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <View style={[styles.documentRow, shadow.card as object]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>{label}</Text>
        <Text style={[type.small, { color: colors.muted }]}>{hint}</Text>
      </View>
      <Button
        label={uploading ? 'Uploading...' : 'Upload PDF'}
        variant="soft"
        onPress={handleUpload}
      />
    </View>
  );
}

function NotificationToggle({ category }: { category: (typeof NOTIFICATION_CATEGORIES)[number] }) {
  const [enabled, setEnabled] = useState(true);

  return (
    <View style={styles.notifItem}>
      <Text style={[type.body, { color: colors.ink }]}>{category.label}</Text>
      <Switch value={enabled} onValueChange={setEnabled} />
    </View>
  );
}

export function AdminSettingsPage() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [businessForm, setBusinessForm] = useState({
    business_name: 'Fairybread & Fractions',
    contact_name: 'Admin',
    contact_email: 'admin@fairybread.com.au',
    phone: '+61 2 1234 5678',
    bank_name: 'ANZ',
    bank_bsb: '012345',
    bank_account: '1234567890',
    bank_account_name: 'Fairybread & Fractions',
  });

  const { data: settings = {}, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => dataClient.getSettings?.() || Promise.resolve({}),
  });

  const businessMutation = useMutation({
    mutationFn: (data: any) =>
      dataClient.updateSettings?.({
        business: {
          business_name: data.business_name,
          contact_name: data.contact_name,
        },
        public_info: {
          contact_email: data.contact_email,
          phone: data.phone,
          bank: {
            name: data.bank_name,
            bsb: data.bank_bsb,
            account: data.bank_account,
            account_name: data.bank_account_name,
          },
        },
      }) || Promise.resolve(null),
    onSuccess: () => {
      refetch();
      alert('Business details updated!');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>Settings</Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Business details and notification preferences.
      </Text>

      {/* Business Information */}
      <View style={styles.section}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Business Information</Text>

        <View style={{ gap: space.md }}>
          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Business name
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.business_name}
              onChangeText={v => setBusinessForm({ ...businessForm, business_name: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Contact name
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.contact_name}
              onChangeText={v => setBusinessForm({ ...businessForm, contact_name: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Contact email
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.contact_email}
              onChangeText={v => setBusinessForm({ ...businessForm, contact_email: v })}
              keyboardType="email-address"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Phone
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.phone}
              onChangeText={v => setBusinessForm({ ...businessForm, phone: v })}
              keyboardType="phone-pad"
              placeholderTextColor={colors.muted}
            />
          </View>

          <Button
            label={businessMutation.isPending ? 'Saving...' : 'Save business info'}
            variant="primary"
            onPress={() => businessMutation.mutate(businessForm)}
          />
        </View>
      </View>

      {/* Bank Details */}
      <View style={styles.section}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Bank Details</Text>

        <View style={{ gap: space.md }}>
          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Bank name
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.bank_name}
              onChangeText={v => setBusinessForm({ ...businessForm, bank_name: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              BSB
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.bank_bsb}
              onChangeText={v => setBusinessForm({ ...businessForm, bank_bsb: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Account number
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.bank_account}
              onChangeText={v => setBusinessForm({ ...businessForm, bank_account: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs, textTransform: 'uppercase' }]}>
              Account name
            </Text>
            <TextInput
              style={styles.input}
              value={businessForm.bank_account_name}
              onChangeText={v => setBusinessForm({ ...businessForm, bank_account_name: v })}
              placeholderTextColor={colors.muted}
            />
          </View>

          <Button
            label={businessMutation.isPending ? 'Saving...' : 'Save bank details'}
            variant="primary"
            onPress={() => businessMutation.mutate(businessForm)}
          />
        </View>
      </View>

      {/* Documents */}
      <View style={styles.section}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Documents</Text>

        <View style={{ gap: space.md }}>
          {DOCUMENTS.map(doc => (
            <DocumentRow key={doc.key} docKey={doc.key} label={doc.label} hint={doc.hint} />
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>Notifications</Text>
        <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
          Choose which events trigger email notifications.
        </Text>

        <View style={{ gap: space.md }}>
          {NOTIFICATION_CATEGORIES.map(cat => (
            <NotificationToggle key={cat.key} category={cat} />
          ))}
        </View>
      </View>
    </ScrollView>
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
  section: {
    marginBottom: space.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 15,
    color: colors.ink,
  },
  documentRow: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
