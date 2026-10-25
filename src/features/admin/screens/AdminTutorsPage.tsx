import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AdminTutorsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', fullName: '', role: 'teacher' as const, subjects: '', color: 'pink' });

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => dataClient.getTeachers?.() || Promise.resolve([]),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await dataClient.inviteStaff?.({
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        subjects: formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [],
        color: formData.color as any,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Invitation sent');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      setShowModal(false);
      setFormData({ email: '', fullName: '', role: 'teacher', subjects: '', color: 'pink' });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    },
  });

  const handleInvite = () => {
    if (!formData.email.trim() || !formData.fullName.trim()) {
      Alert.alert('Missing info', 'Email and name required');
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
          <View>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
              Staff
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Manage tutors and admin.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.fab, shadow.float as object]}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Skeleton height={100} borderRadius={radius.card} />
        ) : teachers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No staff yet. Tap + to invite.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {teachers.map((teacher: any) => (
              <View key={teacher.id} style={[styles.card, shadow.card as object]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.pink,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: space.md,
                    }}
                  >
                    <Text style={[type.h3, { color: '#fff' }]}>
                      {teacher.initials || teacher.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {teacher.name}
                    </Text>
                    {teacher.subjects && (
                      <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                        {teacher.subjects.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadow.sheet as object]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
              <Text style={[type.h2, { color: colors.ink }]}>Invite Staff</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              value={formData.email}
              onChangeText={v => setFormData({ ...formData, email: v })}
              keyboardType="email-address"
            />

            <TextInput
              style={[styles.input, { marginTop: space.md }]}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              value={formData.fullName}
              onChangeText={v => setFormData({ ...formData, fullName: v })}
            />

            <TextInput
              style={[styles.input, { marginTop: space.md }]}
              placeholder="Subjects (comma-separated)"
              placeholderTextColor={colors.muted}
              value={formData.subjects}
              onChangeText={v => setFormData({ ...formData, subjects: v })}
            />

            <Text style={[type.small, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>
              Avatar Color
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {['pink', 'teal', 'yellow', 'orange', 'green', 'magenta'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorChip,
                    { backgroundColor: color === 'pink' ? colors.pink : color === 'teal' ? colors.teal : colors.yellow },
                    formData.color === color && { borderWidth: 2, borderColor: colors.ink },
                  ]}
                  onPress={() => setFormData({ ...formData, color })}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Send Invite"
                onPress={handleInvite}
                disabled={!formData.email.trim() || !formData.fullName.trim() || inviteMutation.isPending}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.pink,
    justifyContent: 'center',
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
    padding: space.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 15,
  },
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
