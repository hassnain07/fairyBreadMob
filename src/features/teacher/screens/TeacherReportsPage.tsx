import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';

export function TeacherReportsPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Get teacher's students
  const { data: sessions = [] } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
      return dataClient.getUpcomingSessions?.({
        from: today,
        to: future,
      }) || Promise.resolve([]);
    },
  });

  const students = React.useMemo(() => {
    const studentMap = new Map<string, any>();
    // Extract unique students from sessions
    return Array.from(studentMap.values());
  }, [sessions]);

  // Form state
  const [overallRating, setOverallRating] = useState(3);
  const [subjectRatings, setSubjectRatings] = useState<Record<string, number>>({ Mathematics: 3, English: 3 });
  const [tutorNote, setTutorNote] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasToImprove, setAreasToImprove] = useState('');

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChildId) throw new Error('Select a child');
      const report = {
        child_id: selectedChildId,
        overall_rating: overallRating,
        subject_ratings: subjectRatings,
        tutor_note: tutorNote,
        strengths,
        areas_to_continue: areasToImprove,
        term_label: new Date().toLocaleDateString('en-AU'),
      };
      await dataClient.createReport?.(report as any);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Report created');
      setSelectedChildId(null);
      setOverallRating(3);
      setTutorNote('');
      setStrengths('');
      setAreasToImprove('');
      queryClient.invalidateQueries({ queryKey: ['teacher-reports'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create report');
    },
  });

  const renderStarPicker = (rating: number, onRatingChange: (r: number) => void) => (
    <View style={styles.starRow}>
      {[...Array(5)].map((_, i) => (
        <TouchableOpacity key={i} onPress={() => onRatingChange(i + 1)}>
          <Star
            size={32}
            fill={i < rating ? colors.yellow : colors.line}
            color={i < rating ? colors.yellow : colors.line}
            style={{ marginRight: space.sm }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!selectedChildId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
          Write a Report
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
          Capture student progress with detailed feedback.
        </Text>

        {students.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              No students to write reports for.
            </Text>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            {students.map(student => (
              <TouchableOpacity
                key={student.id}
                style={[styles.card, shadow.card as object]}
                onPress={() => setSelectedChildId(student.id)}
              >
                <Text style={[type.h3, { color: colors.ink }]}>
                  {student.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentPadding} scrollEventThrottle={16}>
        <TouchableOpacity onPress={() => setSelectedChildId(null)} style={{ marginBottom: space.lg }}>
          <Text style={[type.h3, { color: colors.pink }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[type.h2, { color: colors.ink, marginBottom: space.lg }]}>
          Write Report
        </Text>

        {/* Overall Rating */}
        <View style={{ marginBottom: space.xl }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Overall Progress
          </Text>
          {renderStarPicker(overallRating, setOverallRating)}
        </View>

        {/* Subject Ratings */}
        <View style={{ marginBottom: space.xl }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Subject Ratings
          </Text>
          {Object.entries(subjectRatings).map(([subject, rating]) => (
            <View key={subject} style={{ marginBottom: space.lg }}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                {subject}
              </Text>
              {renderStarPicker(rating, (r) => {
                setSubjectRatings(prev => ({ ...prev, [subject]: r }));
              })}
            </View>
          ))}
        </View>

        {/* Tutor Note */}
        <View style={{ marginBottom: space.xl }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Tutor Note
          </Text>
          <TextInput
            style={[styles.textarea, shadow.card as object]}
            placeholder="A personal message about this student's learning..."
            placeholderTextColor={colors.muted}
            value={tutorNote}
            onChangeText={setTutorNote}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Strengths */}
        <View style={{ marginBottom: space.xl }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Strengths
          </Text>
          <TextInput
            style={[styles.textarea, shadow.card as object]}
            placeholder="What they do well..."
            placeholderTextColor={colors.muted}
            value={strengths}
            onChangeText={setStrengths}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Areas to Improve */}
        <View style={{ marginBottom: space.xl }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Areas to Continue
          </Text>
          <TextInput
            style={[styles.textarea, shadow.card as object]}
            placeholder="What to work on next..."
            placeholderTextColor={colors.muted}
            value={areasToImprove}
            onChangeText={setAreasToImprove}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => setSelectedChildId(null)}
        />
        <Button
          label="Save report"
          onPress={() => createReportMutation.mutate()}
          disabled={createReportMutation.isPending}
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
  textarea: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  starRow: {
    flexDirection: 'row',
    gap: space.sm,
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
