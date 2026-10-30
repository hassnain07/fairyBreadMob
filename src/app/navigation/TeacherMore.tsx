import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  LogOut,
  Settings,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { AppHeader } from '@/components/layout/AppHeader';
import type { TeacherMoreStackParamList } from './types';
import { TeacherAssessmentsPage } from '@/features/teacher/screens/TeacherAssessmentsPage';
import { TeacherReportsPage }      from '@/features/teacher/screens/TeacherReportsPage';
import { NotificationsPage }       from '@/features/parent/screens/NotificationsPage';
import { AccountPage }             from '@/features/parent/screens/AccountPage';
import { dataClient }              from '@/lib/data/client';
import { qk }                      from '@/lib/data/queryKeys';
import type { ClassSlot }          from '@/types/teacher';

const Stack = createNativeStackNavigator<TeacherMoreStackParamList>();

// ── My Classes screen ────────────────────────────────────────────────────────

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function MyClassesScreen() {
  const { teacherId } = useAuth();

  const { data: slots = [], isLoading, refetch } = useQuery({
    queryKey: qk.classSlots,
    queryFn:  () => dataClient.getClassSlots(),
    enabled:  !!teacherId,
    staleTime: 5 * 60_000,
  });

  const mySlots = slots.filter((s: ClassSlot) => s.teacher_id === teacherId && s.is_active);

  return (
    <ScrollView
      style={hubStyles.root}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.huge }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); }} tintColor={colors.teal} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={hubStyles.pageTitle}>My classes</Text>
      <Text style={hubStyles.pageSub}>Classes assigned to you by admin.</Text>

      {isLoading && (
        <Text style={hubStyles.emptyText}>Loading…</Text>
      )}

      {!isLoading && mySlots.length === 0 && (
        <View style={[hubStyles.card, shadow.card, { padding: space.lg }]}>
          <Text style={hubStyles.emptyText}>No classes assigned yet. Contact admin to be added to the timetable.</Text>
        </View>
      )}

      {!isLoading && mySlots.map(slot => (
        <View key={slot.id} style={[hubStyles.classCard, shadow.card]}>
          <View style={hubStyles.classCardHead}>
            <View style={hubStyles.subjectChip}>
              <Text style={hubStyles.subjectChipText}>{slot.subject}</Text>
            </View>
          </View>
          <Text style={hubStyles.classDay}>{DAYS[slot.day_of_week] ?? '—'}</Text>
          <Text style={hubStyles.classTime}>{slot.start_time}</Text>

          <View style={hubStyles.classDetailRow}>
            <Text style={hubStyles.classDetailLabel}>Enrolled</Text>
            <Text style={hubStyles.classDetailValue}>{slot.next_booked_count} / {slot.capacity}</Text>
          </View>

          {/* Progress bar */}
          <View style={hubStyles.progressTrack}>
            <View style={[hubStyles.progressFill, { width: `${Math.min(100, (slot.next_booked_count / slot.capacity) * 100)}%` as any }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Hub types + data ─────────────────────────────────────────────────────────

interface MenuItem { label: string; sub?: string; icon: LucideIcon; screen: string; accent: { bg: string; fg: string } }
interface MenuSection { title: string; items: MenuItem[] }

const SECTIONS: MenuSection[] = [
  {
    title: 'Teaching',
    items: [
      { label: 'My Classes',    sub: 'Class slots assigned to you', icon: BookOpen,      screen: 'MyClasses',   accent: { bg: colors.tealSoft,   fg: colors.avatar.teal.fg   } },
      { label: 'Assessments',   sub: 'Scheduled for your students', icon: CalendarCheck, screen: 'Assessments', accent: { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg   } },
      { label: 'Reports',       sub: 'End-of-term student reports', icon: BarChart3,      screen: 'Reports',     accent: { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg } },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications',   sub: 'Alerts & preferences', icon: Bell,     screen: 'Notifications', accent: { bg: colors.orangeSoft, fg: colors.avatar.orange.fg } },
      { label: 'Account Settings',sub: 'Profile & sign out',   icon: Settings, screen: 'Account',       accent: { bg: colors.surface,   fg: colors.muted            } },
    ],
  },
];

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const name     = user?.fullName?.trim() || user?.firstName || 'Teacher';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[hubStyles.profileCard, shadow.card]}>
      <View style={hubStyles.avatarCircle}>
        <Text style={hubStyles.avatarText}>{initials}</Text>
      </View>
      <View style={hubStyles.profileText}>
        <Text style={hubStyles.profileName}>{name}</Text>
        <Text style={hubStyles.profileRole}>Teacher account</Text>
      </View>
      <TouchableOpacity onPress={onSignOut} style={hubStyles.signOutBtn} hitSlop={12}>
        <LogOut size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────

function MenuRow({ item, onPress, isFirst, isLast }: {
  item: MenuItem; onPress: () => void; isFirst: boolean; isLast: boolean;
}) {
  const Icon = item.icon;
  return (
    <TouchableOpacity
      style={[hubStyles.menuRow, isFirst && hubStyles.menuRowFirst, isLast && hubStyles.menuRowLast, !isLast && hubStyles.menuRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[hubStyles.iconBox, { backgroundColor: item.accent.bg }]}>
        <Icon size={18} color={item.accent.fg} strokeWidth={2} />
      </View>
      <View style={hubStyles.menuRowText}>
        <Text style={hubStyles.menuRowLabel}>{item.label}</Text>
        {item.sub && <Text style={hubStyles.menuRowSub}>{item.sub}</Text>}
      </View>
      <ChevronRight size={16} color={colors.mutedSoft} />
    </TouchableOpacity>
  );
}

// ── Hub screen ────────────────────────────────────────────────────────────────

function TeacherMoreHubScreen({ navigation }: any) {
  const { signOut } = useAuth();

  return (
    <ScrollView
      style={hubStyles.root}
      contentContainerStyle={[
        hubStyles.content,
        { paddingTop: space.lg, paddingBottom: space.huge },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ProfileCard onSignOut={signOut} />

      {SECTIONS.map(section => (
        <View key={section.title} style={hubStyles.section}>
          <Text style={hubStyles.sectionHeader}>{section.title}</Text>
          <View style={[hubStyles.groupCard, shadow.card]}>
            {section.items.map((item, i) => (
              <MenuRow
                key={item.screen}
                item={item}
                onPress={() => navigation.navigate(item.screen)}
                isFirst={i === 0}
                isLast={i === section.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotificationsHandler(navigation: any) {
  return () => navigation.navigate('Notifications');
}
function makeAccountHandler(navigation: any) {
  return () => navigation.navigate('Account');
}

// ── Stack ─────────────────────────────────────────────────────────────────────

export function TeacherMoreStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: (props) => (
          <AppHeader
            {...props}
            variant="detail"
            onNotifications={makeNotificationsHandler(navigation)}
            onAccount={makeAccountHandler(navigation)}
          />
        ),
      })}
    >
      <Stack.Screen
        name="TeacherMoreHub"
        component={TeacherMoreHubScreen}
        options={({ navigation }) => ({
          title: 'More',
          header: (props) => (
            <AppHeader
              {...props}
              variant="root"
              onNotifications={makeNotificationsHandler(navigation)}
              onAccount={makeAccountHandler(navigation)}
            />
          ),
        })}
      />
      <Stack.Screen name="MyClasses"    component={MyClassesScreen}        options={{ title: 'My Classes'   }} />
      <Stack.Screen name="Assessments"  component={TeacherAssessmentsPage} options={{ title: 'Assessments'  }} />
      <Stack.Screen name="Reports"      component={TeacherReportsPage}     options={{ title: 'Reports'      }} />
      <Stack.Screen name="Notifications"component={NotificationsPage}      options={{ title: 'Notifications'}} />
      <Stack.Screen name="Account"      component={AccountPage}            options={{ title: 'Account Settings'}} />
    </Stack.Navigator>
  );
}

// ── Hub styles ────────────────────────────────────────────────────────────────

const hubStyles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: space.lg, gap: space.xl },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub:   { fontFamily: 'DMSans-Regular',  fontSize: 14, color: colors.muted, marginTop: 4 },

  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.line,
  },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: space.sm },

  // class card
  classCard: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg,
    borderWidth: 1, borderColor: colors.line, gap: space.sm,
  },
  classCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectChip: {
    paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
  },
  subjectChipText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.teal },
  classDay:   { fontFamily: 'DMSans-Bold',    fontSize: 17, color: colors.ink },
  classTime:  { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted },
  classDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  classDetailLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },
  classDetailValue: { fontFamily: 'DMSans-Bold',    fontSize: 12, color: colors.ink },
  progressTrack: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: colors.teal, borderRadius: 3 } as any,

  // profile
  profileCard: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderWidth: 1, borderColor: colors.line,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.tealSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 16, fontWeight: '700', color: colors.avatar.teal.fg, letterSpacing: 0.5 },
  profileText:  { flex: 1 },
  profileName:  { fontFamily: 'DMSans-Bold',    fontSize: 16, color: colors.ink,  lineHeight: 21 },
  profileRole:  { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 1 },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line,
  },

  // sections
  section: { gap: space.sm },
  sectionHeader: {
    fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.mutedSoft,
    letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: space.xs,
  },
  groupCard: {
    backgroundColor: colors.card, borderRadius: radius.card,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.card,
  },
  menuRowFirst: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  menuRowLast:  { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  menuRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.line },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuRowText:  { flex: 1 },
  menuRowLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.ink,  lineHeight: 20 },
  menuRowSub:   { fontFamily: 'DMSans-Regular',  fontSize: 12, color: colors.muted, marginTop: 1, lineHeight: 16 },
});
