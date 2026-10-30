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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { AppHeader } from '@/components/layout/AppHeader';
import type { AdminMoreStackParamList } from './types';
import { NotificationsPage }      from '@/features/parent/screens/NotificationsPage';
import { AccountPage }            from '@/features/parent/screens/AccountPage';
import { AdminTutorsPage }        from '@/features/admin/screens/AdminTutorsPage';
import { AdminParentsPage }       from '@/features/admin/screens/AdminParentsPage';
import { AdminTimetablePage }     from '@/features/admin/screens/AdminTimetablePage';
import { AdminAssessmentsPage }   from '@/features/admin/screens/AdminAssessmentsPage';
import { AdminProgramsPage }      from '@/features/admin/screens/AdminProgramsPage';
import { AdminFamilyBookingPage } from '@/features/admin/screens/AdminFamilyBookingPage';
import { AdminShopOrdersPage }    from '@/features/admin/screens/AdminShopOrdersPage';
import { AdminShopProductsPage }  from '@/features/admin/screens/AdminShopProductsPage';
import { AdminSettingsPage }      from '@/features/admin/screens/AdminSettingsPage';
import { AdminMyTeachingPage }    from '@/features/admin/screens/AdminMyTeachingPage';

const Stack = createNativeStackNavigator<AdminMoreStackParamList>();

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem { label: string; sub?: string; icon: LucideIcon; screen: string; accent: { bg: string; fg: string } }
interface MenuSection { title: string; items: MenuItem[] }

const SECTIONS: MenuSection[] = [
  {
    title: 'Management',
    items: [
      { label: 'Family Booking', sub: 'Book sessions for a family',    icon: BookOpen,      screen: 'FamilyBooking', accent: { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg   } },
      { label: 'Tutors',         sub: 'Teaching staff & subjects',    icon: GraduationCap,  screen: 'Tutors',        accent: { bg: colors.tealSoft,   fg: colors.avatar.teal.fg   } },
      { label: 'Parents',        sub: 'Families & enrolments',        icon: Users,          screen: 'Parents',       accent: { bg: colors.orangeSoft, fg: colors.avatar.orange.fg } },
    ],
  },
  {
    title: 'Schedule',
    items: [
      { label: 'Timetable',     sub: 'Class slots & teachers',         icon: CalendarClock, screen: 'Timetable',     accent: { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg } },
      { label: 'Assessments',   sub: 'Schedule & track assessments',  icon: ClipboardList, screen: 'Assessments',   accent: { bg: colors.greenSoft,  fg: colors.avatar.green.fg  } },
      { label: 'Programs',      sub: 'Subject programs catalog',     icon: BookOpen,      screen: 'Programs',      accent: { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg   } },
    ],
  },
  {
    title: 'Shop',
    items: [
      { label: 'Shop Orders',   sub: 'Review & fulfil orders',        icon: Package,       screen: 'ShopOrders',    accent: { bg: colors.tealSoft,   fg: colors.avatar.teal.fg   } },
      { label: 'Shop Products', sub: 'Manage product inventory',      icon: ShoppingBag,   screen: 'ShopProducts',  accent: { bg: colors.orangeSoft, fg: colors.avatar.orange.fg } },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications',   sub: 'Alerts & preferences',        icon: Bell,     screen: 'Notifications', accent: { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg } },
      { label: 'Settings',        sub: 'App config & documents',     icon: Settings, screen: 'Settings',     accent: { bg: colors.surface,   fg: colors.muted            } },
      { label: 'Account Settings', sub: 'Profile & sign out',        icon: Users,    screen: 'Account',     accent: { bg: colors.surface,   fg: colors.muted            } },
    ],
  },
];

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const name     = user?.fullName?.trim() || user?.firstName || 'Admin';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[hubStyles.profileCard, shadow.card]}>
      <View style={hubStyles.avatarCircle}>
        <Text style={hubStyles.avatarText}>{initials}</Text>
      </View>
      <View style={hubStyles.profileText}>
        <Text style={hubStyles.profileName}>{name}</Text>
        <Text style={hubStyles.profileRole}>Admin account</Text>
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

function AdminMoreHubScreen({ navigation }: any) {
  const { signOut } = useAuth();

  return (
    <ScrollView
      style={hubStyles.root}
      contentContainerStyle={[hubStyles.content, { paddingTop: space.lg, paddingBottom: space.huge }]}
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

export function AdminMoreStack() {
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
        name="MoreHub"
        component={AdminMoreHubScreen}
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
      <Stack.Screen name="FamilyBooking" component={AdminFamilyBookingPage} options={{ title: 'Family Booking' }} />
      <Stack.Screen name="MyTeaching"   component={AdminMyTeachingPage}     options={{ title: 'My Teaching'   }} />
      <Stack.Screen name="Tutors"       component={AdminTutorsPage}         options={{ title: 'Tutors'        }} />
      <Stack.Screen name="Parents"      component={AdminParentsPage}        options={{ title: 'Parents'       }} />
      <Stack.Screen name="Timetable"    component={AdminTimetablePage}      options={{ title: 'Timetable'    }} />
      <Stack.Screen name="Assessments"  component={AdminAssessmentsPage}   options={{ title: 'Assessments'   }} />
      <Stack.Screen name="Programs"     component={AdminProgramsPage}      options={{ title: 'Programs'      }} />
      <Stack.Screen name="ShopOrders"   component={AdminShopOrdersPage}   options={{ title: 'Shop Orders'   }} />
      <Stack.Screen name="ShopProducts" component={AdminShopProductsPage} options={{ title: 'Shop Products' }} />
      <Stack.Screen name="Settings"     component={AdminSettingsPage}     options={{ title: 'Settings'      }} />
      <Stack.Screen name="Notifications" component={NotificationsPage}     options={{ title: 'Notifications' }} />
      <Stack.Screen name="Account"      component={AccountPage}           options={{ title: 'Account Settings' }} />
    </Stack.Navigator>
  );
}

// ── Hub styles ────────────────────────────────────────────────────────────────

const hubStyles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: space.lg, gap: space.xl },

  // profile
  profileCard: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderWidth: 1, borderColor: colors.line,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 16, fontWeight: '700', color: colors.avatar.pink.fg, letterSpacing: 0.5 },
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
