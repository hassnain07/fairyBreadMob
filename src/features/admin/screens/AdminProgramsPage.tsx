import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AdminProgramsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'pink', is_active: true });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: () => dataClient.getPrograms?.() || Promise.resolve([]),
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      await dataClient.upsertProgram?.({
        id: editingId || undefined,
        name: formData.name,
        description: formData.description,
        color: formData.color as any,
        is_active: formData.is_active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', description: '', color: 'pink', is_active: true });
    },
  });

  const handleNew = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', color: 'pink', is_active: true });
    setShowModal(true);
  };

  const handleEdit = (program: any) => {
    setEditingId(program.id);
    setFormData({
      name: program.name,
      description: program.description || '',
      color: program.color || 'pink',
      is_active: program.is_active !== false,
    });
    setShowModal(true);
  };

  const colorOptions = ['pink', 'teal', 'yellow', 'orange', 'green', 'magenta'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
          <View>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
              Programs
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Manage subjects and classes.
            </Text>
          </View>
          <TouchableOpacity onPress={handleNew} style={[styles.fab, shadow.float as object]}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={100} borderRadius={radius.card} />
          </View>
        ) : programs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No programs yet. Tap + to create one.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {programs.map((program: any) => (
              <TouchableOpacity
                key={program.id}
                style={[styles.card, shadow.card as object]}
                onPress={() => handleEdit(program)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: program.color === 'pink' ? colors.pink : colors.teal,
                      marginRight: space.md,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {program.name}
                    </Text>
                    {program.description && (
                      <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                        {program.description}
                      </Text>
                    )}
                  </View>
                  {!program.is_active && (
                    <Text style={[type.caption, { color: colors.muted }]}>Inactive</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadow.sheet as object]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
              <Text style={[type.h2, { color: colors.ink }]}>
                {editingId ? 'Edit Program' : 'New Program'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input]}
              placeholder="Program name"
              placeholderTextColor={colors.muted}
              value={formData.name}
              onChangeText={v => setFormData({ ...formData, name: v })}
            />

            <TextInput
              style={[styles.input, { marginTop: space.md }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.muted}
              value={formData.description}
              onChangeText={v => setFormData({ ...formData, description: v })}
              multiline
              numberOfLines={2}
            />

            <Text style={[type.small, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>
              Color
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {colorOptions.map(color => (
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
                label={editingId ? 'Update' : 'Create'}
                onPress={() => upsertMutation.mutate()}
                disabled={!formData.name.trim() || upsertMutation.isPending}
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
