import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { useChildren } from '../hooks/useChildren';
import { dataClient } from '@/lib/data/client';

export function ChildrenPage() {
  const { familyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: children = [], isLoading } = useChildren(familyId);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Form state
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [year, setYear] = useState('Year 1');
  const [school, setSchool] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddChild = async () => {
    setFormError(null);

    if (!givenName.trim()) {
      setFormError('Please enter a given name.');
      return;
    }

    if (!familyName.trim()) {
      setFormError('Please enter a family name.');
      return;
    }

    setSubmitting(true);
    try {
      if (!familyId) throw new Error('Family ID required');

      await dataClient.addChild(familyId, {
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        year,
        school: school.trim() || undefined,
      });

      // Invalidate children query
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });

      // Reset form
      setGivenName('');
      setFamilyName('');
      setYear('Year 1');
      setSchool('');

      // Close sheet
      bottomSheetRef.current?.dismiss();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to add child. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={60} borderRadius={radius.card} />
        <Skeleton height={100} borderRadius={radius.card} style={{ marginTop: space.lg }} />
        <Skeleton height={100} borderRadius={radius.card} style={{ marginTop: space.lg }} />
      </ScrollView>
    );
  }

  if (children.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
            My children
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Keep an eye on their learning journey.
          </Text>
        </View>

        <EmptyState
          icon={Users}
          title="No children added yet"
          description="Create your first profile to get started."
          actionLabel="Add your first child"
          onAction={() => bottomSheetRef.current?.present()}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerWithButton}>
          <View>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
              My children
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Keep an eye on their learning journey.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.present()}
            style={styles.addButton}
          >
            <Plus size={24} color={colors.pink} />
          </TouchableOpacity>
        </View>

        {/* Children List */}
        <View style={styles.childrenList}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childCard, shadow.card as object]}
              onPress={() => {
                // Navigate to child profile
              }}
            >
              <Avatar initials={child.initials} size={56} />

              <View style={styles.childInfo}>
                <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>
                  {child.name}
                </Text>
                <Text style={[type.small, { color: colors.muted, marginBottom: space.sm }]}>
                  {child.year} · {child.school || 'No school'}
                </Text>

                {child.subjects && child.subjects.length > 0 && (
                  <View style={styles.subjectTags}>
                    {child.subjects.map((subject) => (
                      <Pill
                        key={subject}
                        label={subject}
                        variant="neutral"
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.childActions}>
                <Pill
                  label={child.enrolled ? 'Enrolled' : 'Enrolment needed'}
                  variant={child.enrolled ? 'success' : 'pending'}
                />
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to child profile
                  }}
                >
                  <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>
                    View profile →
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Child Sheet */}
      <BottomSheetModal ref={bottomSheetRef} snapPoints={['80%']}>
        <View style={styles.sheetContent}>
          <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
            Add a child
          </Text>

          {refreshError && (
            <View style={styles.errorBox}>
              <Text style={[type.small, { color: colors.status.danger.fg }]}>
                {refreshError}
              </Text>
            </View>
          )}

          {formError && (
            <View style={styles.errorBox}>
              <Text style={[type.small, { color: colors.status.danger.fg }]}>
                {formError}
              </Text>
            </View>
          )}

          <View style={styles.formField}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.sm }]}>
              Given name *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emma"
              value={givenName}
              onChangeText={setGivenName}
              editable={!submitting}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.sm }]}>
              Family name *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Smith"
              value={familyName}
              onChangeText={setFamilyName}
              editable={!submitting}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.sm }]}>
              Year level
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                // Open year selector
              }}
            >
              <Text style={[type.body, { color: colors.ink }]}>{year}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.sm }]}>
              School (optional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. St Mary's Primary"
              value={school}
              onChangeText={setSchool}
              editable={!submitting}
            />
          </View>

          <View style={styles.formActions}>
            <Button
              label={submitting ? 'Adding...' : 'Add child'}
              variant="primary"
              onPress={handleAddChild}
              loading={submitting}
              fullWidth
            />
          </View>
        </View>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    gap: space.lg,
  },
  header: {
    marginBottom: space.lg,
  },
  headerWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pinkSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childrenList: {
    gap: space.lg,
  },
  childCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    gap: space.lg,
  },
  childInfo: {
    flex: 1,
  },
  childActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  subjectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  errorBox: {
    backgroundColor: colors.status.danger.bg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  formField: {
    marginBottom: space.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  formActions: {
    marginTop: space.lg,
    gap: space.md,
  },
});
