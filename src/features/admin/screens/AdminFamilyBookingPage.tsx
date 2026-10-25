import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AdminFamilyBookingPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ familyId: '', childId: '', sessionId: '' });

  const { data: families = [], isLoading: familiesLoading } = useQuery({
    queryKey: ['admin-families'],
    queryFn: () => dataClient.getAllFamilies?.() || Promise.resolve([]),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return dataClient.getUpcomingSessions?.({ from: today }) || Promise.resolve([]);
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!formData.childId || !formData.sessionId) throw new Error('Select child and session');
      await dataClient.bookClassSession?.(formData.childId, formData.sessionId);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Booking created');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowModal(false);
      setFormData({ familyId: '', childId: '', sessionId: '' });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to book');
    },
  });

  const selectedFamily = families.find((f: any) => f.id === formData.familyId);
  const familyChildren = selectedFamily?.children || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
          <View>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
              Family Booking
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Book classes on behalf of families.
            </Text>
          </View>
          <Button
            label="Book"
            onPress={() => setShowModal(true)}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={[type.small, { color: colors.muted }]}>
            Select a family, child, and available session to make a booking.
          </Text>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadow.sheet as object]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
              <Text style={[type.h2, { color: colors.ink }]}>Book Class</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Family selector */}
            <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
              Family
            </Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: space.lg }} nestedScrollEnabled>
              {families.map((family: any) => (
                <TouchableOpacity
                  key={family.id}
                  style={[
                    styles.option,
                    formData.familyId === family.id && styles.optionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, familyId: family.id, childId: '' })}
                >
                  <Text style={[type.small, { color: formData.familyId === family.id ? '#fff' : colors.ink }]}>
                    {family.parent_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Child selector */}
            {familyChildren.length > 0 && (
              <>
                <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                  Child
                </Text>
                <ScrollView style={{ maxHeight: 150, marginBottom: space.lg }} nestedScrollEnabled>
                  {familyChildren.map((child: any) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.option,
                        formData.childId === child.id && styles.optionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, childId: child.id })}
                    >
                      <Text style={[type.small, { color: formData.childId === child.id ? '#fff' : colors.ink }]}>
                        {child.given_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Session selector */}
            <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
              Session
            </Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: space.lg }} nestedScrollEnabled>
              {sessions.map((session: any) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.option,
                    formData.sessionId === session.id && styles.optionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, sessionId: session.id })}
                >
                  <Text style={[type.small, { color: formData.sessionId === session.id ? '#fff' : colors.ink }]}>
                    {new Date(session.starts_at).toLocaleDateString('en-AU')} · {new Date(session.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Book"
                onPress={() => bookMutation.mutate()}
                disabled={!formData.childId || !formData.sessionId || bookMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
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
    padding: space.lg,
    maxHeight: '80%',
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionSelected: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
});
