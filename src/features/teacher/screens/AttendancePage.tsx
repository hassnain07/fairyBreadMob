import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function AttendancePage({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});

  // Get today's sessions for this teacher
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teacher-sessions-today'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return dataClient.getUpcomingSessions?.({
        from: today,
        to: tomorrow,
        teacherId: user?.id,
      }) || Promise.resolve([]);
    },
  });

  // Get children in selected session
  const { data: attendanceRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance', selectedSessionId],
    queryFn: () => selectedSessionId ? dataClient.getAttendance?.(selectedSessionId) || Promise.resolve([]) : Promise.resolve([]),
    enabled: !!selectedSessionId,
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId || Object.keys(attendance).length === 0) {
        throw new Error('Mark attendance before saving');
      }
      const records = Object.entries(attendance).map(([childId, status]) => ({
        childId,
        status,
      }));
      await dataClient.saveAttendance?.(selectedSessionId, records as any);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Attendance saved');
      setAttendance({});
      setSelectedSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save attendance');
    },
  });

  const handleToggleAttendance = (childId: string) => {
    setAttendance(prev => ({
      ...prev,
      [childId]: prev[childId] === 'present' ? 'absent' : 'present',
    }));
  };

  if (!selectedSessionId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
          Attendance
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
          Mark attendance for today's classes.
        </Text>

        {isLoading ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={100} borderRadius={radius.card} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No classes scheduled for today.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {sessions.map(session => (
              <TouchableOpacity
                key={session.id}
                style={[styles.sessionCard, shadow.card as object]}
                onPress={() => setSelectedSessionId(session.id)}
              >
                <View style={styles.sessionContent}>
                  <View style={styles.timeBlock}>
                    <Text style={[type.caption, { color: '#fff', textAlign: 'center' }]}>
                      {new Date(session.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {(session as any)?.class?.program?.name || 'Class'}
                    </Text>
                    <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                      {session.booked_count} students enrolled
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // Attendance marking view
  const session = sessions.find(s => s.id === selectedSessionId);

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <TouchableOpacity onPress={() => setSelectedSessionId(null)} style={{ marginBottom: space.lg }}>
          <Text style={[type.h3, { color: colors.pink }]}>← Back to classes</Text>
        </TouchableOpacity>

        <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>
          {(session as any)?.class?.program?.name || 'Class'}
        </Text>
        <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
          {new Date(session?.starts_at || '').toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {recordsLoading ? (
          <View style={{ gap: space.lg }}>
            <Skeleton height={60} borderRadius={radius.card} />
            <Skeleton height={60} borderRadius={radius.card} />
          </View>
        ) : attendanceRecords.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No students in this class.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md, marginBottom: space.xl }}>
            {attendanceRecords.map((record: any) => {
              const status = attendance[record.child_id] || record.status || 'absent';
              return (
                <TouchableOpacity
                  key={record.child_id}
                  style={[
                    styles.attendanceRow,
                    status === 'present' && styles.attendanceRowPresent,
                  ]}
                  onPress={() => handleToggleAttendance(record.child_id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h3, { color: colors.ink }]}>
                      {record.child_name || `Student ${record.child_id.substring(0, 8)}`}
                    </Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    {status === 'present' ? (
                      <Check size={20} color="#fff" />
                    ) : (
                      <X size={20} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => setSelectedSessionId(null)}
        />
        <Button
          label="Save attendance"
          onPress={() => saveAttendanceMutation.mutate()}
          disabled={Object.keys(attendance).length === 0 || saveAttendanceMutation.isPending}
        />
      </View>
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
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceRow: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  attendanceRowPresent: {
    backgroundColor: '#EDF9EF',
    borderColor: '#C9EBCE',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
