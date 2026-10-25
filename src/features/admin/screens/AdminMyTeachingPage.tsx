import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/app/_providers';
import { colors, type, space } from '@/theme';
import { TouchableOpacity } from 'react-native';
import { TeacherHomeScreen } from '@/features/teacher/screens/TeacherHomeScreen';
import { TeacherStudentsPage } from '@/features/teacher/screens/TeacherStudentsPage';
import { AttendancePage } from '@/features/teacher/screens/AttendancePage';
import { TeacherAssessmentsPage } from '@/features/teacher/screens/TeacherAssessmentsPage';
import { TeacherReportsPage } from '@/features/teacher/screens/TeacherReportsPage';

type Tab = 'dashboard' | 'students' | 'attendance' | 'assessments' | 'reports';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'students', label: 'My students' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'reports', label: 'Reports' },
];

export function AdminMyTeachingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Text style={[type.body, { color: colors.muted }]}>
            Your account isn't set up as a teacher. Ask an admin to create a teacher profile for you.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[type.small, { color: tab === t.id ? colors.pink : colors.muted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {tab === 'dashboard' && <TeacherHomeScreen />}
      {tab === 'students' && <TeacherStudentsPage />}
      {tab === 'attendance' && <AttendancePage />}
      {tab === 'assessments' && <TeacherAssessmentsPage />}
      {tab === 'reports' && <TeacherReportsPage />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabBarContent: {
    paddingHorizontal: space.lg,
    gap: space.md,
    paddingVertical: space.sm,
  },
  tab: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.pink,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: space.lg,
    margin: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
