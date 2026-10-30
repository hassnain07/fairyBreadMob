/**
 * TeacherClassesScreen — "My classes" view.
 * Extracted so both TeacherMore and AdminMyTeaching can reuse it.
 */
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassSlot } from '@/types/teacher';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  /** Override the teacherId (used by admin's MyTeaching view). */
  teacherIdOverride?: string;
}

export function TeacherClassesScreen({ teacherIdOverride }: Props) {
  const { teacherId: authTeacherId } = useAuth();
  const teacherId = teacherIdOverride ?? authTeacherId;

  const { data: slots = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: qk.classSlots,
    queryFn:  () => dataClient.getClassSlots(),
    enabled:  !!teacherId,
    staleTime: 5 * 60_000,
  });

  const mySlots = slots.filter((s: ClassSlot) => s.teacher_id === teacherId && s.is_active);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.huge }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.teal} />}
      showsVerticalScrollIndicator={false}
    >
      {isLoading && (
        <View style={{ gap: space.lg }}>
          {[1, 2].map(i => <View key={i} style={[styles.classCard, shadow.card]} />)}
        </View>
      )}

      {!isLoading && mySlots.length === 0 && (
        <View style={[styles.emptyCard, shadow.card]}>
          <Text style={styles.emptyText}>No classes assigned yet. Contact admin to be added to the timetable.</Text>
        </View>
      )}

      {!isLoading && mySlots.map(slot => {
        const pct = slot.capacity > 0 ? Math.min(100, (slot.next_booked_count / slot.capacity) * 100) : 0;
        return (
          <View key={slot.id} style={[styles.classCard, shadow.card]}>
            <View style={styles.classCardHead}>
              <View style={styles.subjectChip}>
                <Text style={styles.subjectChipText}>{slot.subject}</Text>
              </View>
            </View>
            <Text style={styles.classDay}>{DAYS[slot.day_of_week] ?? '—'}</Text>
            <Text style={styles.classTime}>{slot.start_time}</Text>

            <View style={styles.classDetailRow}>
              <Text style={styles.classDetailLabel}>Enrolled</Text>
              <Text style={styles.classDetailValue}>{slot.next_booked_count} / {slot.capacity}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },
  classCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line, gap: space.sm },
  classCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectChip: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.tealSoft },
  subjectChipText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.teal },
  classDay: { fontFamily: 'DMSans-Bold', fontSize: 17, color: colors.ink },
  classTime: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted },
  classDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  classDetailLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },
  classDetailValue: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink },
  progressTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.teal, borderRadius: 3 },
});
