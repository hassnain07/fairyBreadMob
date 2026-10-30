import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/app/_providers';
import { colors, type, space, radius } from '@/theme';
import { TeacherHomeScreen }      from '@/features/teacher/screens/TeacherHomeScreen';
import { TeacherClassesScreen }   from '@/features/teacher/screens/TeacherClassesScreen';
import { TeacherStudentsPage }    from '@/features/teacher/screens/TeacherStudentsPage';
import { AttendancePage }         from '@/features/teacher/screens/AttendancePage';
import { TeacherAssessmentsPage } from '@/features/teacher/screens/TeacherAssessmentsPage';
import { TeacherReportsPage }     from '@/features/teacher/screens/TeacherReportsPage';

type Tab = 'dashboard' | 'classes' | 'students' | 'attendance' | 'assessments' | 'reports';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',   label: 'Overview'    },
  { id: 'classes',     label: 'My classes'  },
  { id: 'students',    label: 'My students' },
  { id: 'attendance',  label: 'Attendance'  },
  { id: 'assessments', label: 'Assessments' },
  { id: 'reports',     label: 'Reports'     },
];

export function AdminMyTeachingPage({ navigation }: any) {
  const { teacherId } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!teacherId) {
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
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {tab === 'dashboard'   && <TeacherHomeScreen navigation={navigation} />}
      {tab === 'classes'     && <TeacherClassesScreen teacherIdOverride={teacherId} />}
      {tab === 'students'    && <TeacherStudentsPage />}
      {tab === 'attendance'  && <AttendancePage />}
      {tab === 'assessments' && <TeacherAssessmentsPage />}
      {tab === 'reports'     && <TeacherReportsPage />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },

  // tab bar
  tabBar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabBarContent: {
    paddingHorizontal: space.lg,
    gap: space.xs,
    paddingVertical: space.sm,
  },
  tab: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  tabActive: { backgroundColor: colors.pinkSoft },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: colors.muted,
  },
  tabTextActive: { fontFamily: 'DMSans-Bold', color: colors.pink },

  // empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.xl,
    margin: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
