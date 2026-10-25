import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export function AdminTimetablePage() {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['admin-class-slots'],
    queryFn: () => dataClient.getClassSlots?.() || Promise.resolve([]),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      await dataClient.deactivateClassSlot?.(slotId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-class-slots'] });
    },
  });

  // Build grid: [day][time] => slot
  const grid: Record<number, Record<string, any>> = {};
  DAYS.forEach((_, dayIdx) => {
    grid[dayIdx] = {};
    TIMES.forEach(time => {
      grid[dayIdx][time] = null;
    });
  });

  slots.forEach((slot: any) => {
    const dayIdx = slot.day_of_week; // 0-6
    const timeStr = slot.start_time; // "08:00"
    if (dayIdx >= 0 && dayIdx < 7 && grid[dayIdx]) {
      grid[dayIdx][timeStr] = slot;
    }
  });

  const handleDeleteSlot = (slotId: string) => {
    Alert.alert(
      'Delete class slot?',
      'This will cancel all future sessions.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: () => deleteSlotMutation.mutate(slotId),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding} scrollEventThrottle={16} horizontal={false}>
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        Timetable
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Manage your class schedule.
      </Text>

      {isLoading ? (
        <Skeleton height={300} borderRadius={radius.card} />
      ) : (
        <ScrollView horizontal style={styles.gridContainer} showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row (times) */}
            <View style={styles.headerRow}>
              <View style={styles.dayCell} />
              {TIMES.map(time => (
                <View key={time} style={styles.timeHeaderCell}>
                  <Text style={[type.caption, { color: colors.muted, textAlign: 'center' }]}>
                    {time}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day rows */}
            {DAYS.map((day, dayIdx) => (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayCell}>
                  <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
                    {day.substring(0, 3)}
                  </Text>
                </View>
                {TIMES.map(time => {
                  const slot = grid[dayIdx]?.[time];
                  return (
                    <View key={`${day}-${time}`} style={styles.slotCell}>
                      {slot ? (
                        <TouchableOpacity
                          style={[
                            styles.slotChip,
                            { backgroundColor: slot.program?.color === 'pink' ? colors.pink : colors.teal },
                          ]}
                          onLongPress={() => handleDeleteSlot(slot.id)}
                        >
                          <Text style={[type.caption, { color: '#fff', textAlign: 'center' }]} numberOfLines={2}>
                            {slot.program?.name}
                          </Text>
                          <Text style={[type.caption, { color: 'rgba(255,255,255,0.8)' }]}>
                            {slot.capacity}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.emptySlot}
                          onPress={() => setSelectedSlot({ day: dayIdx, time })}
                        >
                          <Plus size={16} color={colors.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Text style={[type.small, { color: colors.muted, marginTop: space.lg }]}>
        💡 Tap + to add a class. Long-press to delete.
      </Text>
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
  gridContainer: {
    marginBottom: space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: space.sm,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: space.sm,
  },
  dayCell: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: space.xs,
  },
  timeHeaderCell: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: space.xs,
  },
  slotCell: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.xs,
  },
  slotChip: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
