import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextStyle,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Plus } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LogOut } from 'lucide-react-native';
import { ChildSwitcher } from '@/components/domain/ChildSwitcher';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import { UnlockBanner } from '@/components/domain/UnlockBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useChildren } from '../hooks/useChildren';
import { useFamilyGating } from '../hooks/useFamilyGating';
import { useBookings } from '../hooks/useBookings';
import { dataClient } from '@/lib/data/client';
import type { Child } from '@/types/family';
import type { ParentTabParamList } from '@/app/navigation/types';

type Props = BottomTabScreenProps<ParentTabParamList, 'ParentHome'>;

export function ParentHomeScreen({ navigation }: Props) {
  const { user, familyId, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [year, setYear] = useState('Year 1');
  const [school, setSchool] = useState('');

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
      setFormError(null);

      // Close sheet
      setShowAddChildForm(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to add child. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddChild = () => {
    console.log('🔵 handleOpenAddChild called');
    setShowAddChildForm(!showAddChildForm);
  };

  const handleCloseAddChild = () => {
    setShowAddChildForm(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      console.error('Sign out error:', e);
    }
  };

  // Queries
  const { data: children = [], isLoading: childrenLoading, error: childrenError } = useChildren(familyId);
  const { data: gating, isLoading: gatingLoading } = useFamilyGating(familyId);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(familyId);

  // Debug log
  React.useEffect(() => {
    console.log('ParentHomeScreen - children:', children, 'loading:', childrenLoading, 'error:', childrenError, 'familyId:', familyId);
  }, [children, childrenLoading, childrenError, familyId]);

  // Persist and restore last-selected child
  useEffect(() => {
    if (children.length > 0) {
      if (!selectedChildId || !children.find((c) => c.id === selectedChildId)) {
        setSelectedChildId(children[0].id);
      }
    }
  }, [children]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId),
    [children, selectedChildId]
  );

  const childBookings = useMemo(
    () => bookings.filter((b) => b.child_id === selectedChildId),
    [bookings, selectedChildId]
  );

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const handleSelectChild = (child: Child) => {
    setSelectedChildId(child.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['family-gating', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['bookings', familyId] });
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = childrenLoading || gatingLoading || bookingsLoading;

  // Render the add child form
  const renderAddChildForm = () => (
    <Modal
      visible={showAddChildForm}
      transparent
      animationType="slide"
      onRequestClose={handleCloseAddChild}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[type.h2, { color: colors.ink }]}>
              Add a child
            </Text>
            <TouchableOpacity onPress={handleCloseAddChild}>
              <Text style={[type.h2, { color: colors.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

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
            <Button
              label="Cancel"
              variant="ghost"
              onPress={handleCloseAddChild}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Empty state: no children
  if (!isLoading && children.length === 0) {
    return (
      <>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Header with Sign Out */}
          <View style={styles.headerRow}>
            <Text style={[type.h3, { color: colors.ink } as TextStyle]}>
              Welcome
            </Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <LogOut size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <EmptyState
            icon={Users}
            title="No children added yet"
            description="Start by adding your first child to get set up."
            actionLabel="Add your first child"
            onAction={handleOpenAddChild}
          />
        </ScrollView>

        {renderAddChildForm()}
      </>
    );
  }

  // Main dashboard
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Sign Out */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm } as TextStyle]}>
              Good {getTimeOfDay()}, {user?.firstName}
            </Text>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}>
              Here is what is happening with your family this week.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Child Switcher */}
        {children.length > 1 && (
          <ChildSwitcher
            children={children}
            selectedChildId={selectedChildId || undefined}
            onSelectChild={handleSelectChild}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={{ gap: space.lg }}>
            <Skeleton height={200} borderRadius={radius.card} style={styles.skeleton} />
            <Skeleton height={120} borderRadius={radius.card} style={styles.skeleton} />
            <Skeleton height={150} borderRadius={radius.card} style={styles.skeleton} />
          </View>
        )}

        {!isLoading && selectedChild && (
          <>
            {/* Welcome Card with Gradient */}
            <LinearGradient
              colors={['#FFF1F5', '#FFF9E3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, styles.welcomeCard, shadow.card as object]}
            >
              <View style={styles.welcomeContent}>
                <View>
                  <Text
                    style={[
                      type.h1,
                      { color: colors.ink, marginBottom: space.sm, fontSize: 24 } as TextStyle,
                    ]}
                  >
                    {selectedChild.givenName} is having a
                    <Text style={[type.accent, { color: colors.pink }]}>
                      {' '}
                      great
                    </Text>{' '}
                    learning journey.
                  </Text>
                  <Text
                    style={[type.body, { color: colors.muted, marginBottom: space.lg } as TextStyle]}
                  >
                    Keep an eye on their progress and celebrate their wins along the way.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.getParent()?.navigate('ParentMore')}
                >
                  <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>
                    View {selectedChild.givenName}'s progress →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Yellow sun badge - right side */}
              <View style={styles.sunBadge}>
                <View
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    backgroundColor: '#F6CA42',
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'white',
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  } as TextStyle}
                >
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Term Credit Meter (if active term) */}
            {gating?.state === 'ACTIVE_TERM' && gating.end_date && (
              <TermCreditMeter
                creditsRemaining={gating.classes_remaining}
                creditsTotal={10}
                endDate={gating.end_date}
              />
            )}

            {/* Expiry Warning Banner */}
            {gating?.state === 'TERM_EXPIRED' && <UnlockBanner type="expired" />}

            {/* Progress Card */}
            <View style={[styles.card, shadow.card as object]}>
              <Text
                style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}
              >
                {selectedChild.givenName} is doing great!
              </Text>
              <Text style={[type.eyebrow, { color: colors.mutedSoft, marginBottom: space.lg }]}>
                {selectedChild.year} · {selectedChild.school}
              </Text>

              {childBookings.length > 0 ? (
                <>
                  <Text
                    style={[type.small, { color: colors.muted, marginBottom: space.md }]}
                  >
                    {childBookings.length} class(es) booked this term
                  </Text>
                  <View style={styles.progressRow}>
                    <Text
                      style={[
                        type.bodyStrong,
                        { color: colors.pink, marginBottom: space.sm },
                      ]}
                    >
                      {childBookings.length} / 10 sessions
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('Bookings');
                    }}
                  >
                    <Text
                      style={[
                        type.small,
                        { color: colors.pink, fontWeight: '600', marginTop: space.md },
                      ]}
                    >
                      View bookings →
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[type.small, { color: colors.muted }]}>
                  No classes booked yet this term.
                </Text>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Button
                label="Add child"
                variant="secondary"
                icon={Plus}
                onPress={handleOpenAddChild}
                fullWidth
              />
              <Button
                label="Book a class"
                variant="primary"
                onPress={() => {
                  navigation.navigate('Book');
                }}
                fullWidth
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Child Modal - always available */}
      {renderAddChildForm()}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    paddingTop: space.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  skeleton: {
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderColor: 'transparent',
  },
  welcomeContent: {
    flex: 1,
    marginRight: space.lg,
  },
  secondaryButton: {
    paddingVertical: space.sm,
  },
  sunBadge: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRow: {
    marginBottom: space.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: space.md,
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
