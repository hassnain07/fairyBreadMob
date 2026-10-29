import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
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
import type { ParentMoreStackParamList } from './types';
import { PaymentsPage }      from '@/features/parent/screens/PaymentsPage';
import { ChildrenPage }      from '@/features/parent/screens/ChildrenPage';
import { ChildProfilePage }  from '@/features/parent/screens/ChildProfilePage';
import { NotificationsPage } from '@/features/parent/screens/NotificationsPage';
import { AssessmentsPage }   from '@/features/parent/screens/AssessmentsPage';
import { BookAssessmentPage } from '@/features/parent/screens/BookAssessmentPage';
import { ReportsPage }        from '@/features/parent/screens/ReportsPage';
import { EnrolmentPage }      from '@/features/parent/screens/EnrolmentPage';
import { LearningShopPage }   from '@/features/parent/screens/LearningShopPage';
import { MyOrdersPage }       from '@/features/parent/screens/MyOrdersPage';
import { AccountPage }        from '@/features/parent/screens/AccountPage';

const Stack = createNativeStackNavigator<ParentMoreStackParamList>();

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  label:    string;
  sub?:     string;
  icon:     LucideIcon;
  screen:   string;
  accent:   { bg: string; fg: string };
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SECTIONS: MenuSection[] = [
  {
    title: 'Learning',
    items: [
      {
        label:  'My Children',
        sub:    'Manage profiles',
        icon:   Users,
        screen: 'MyChildren',
        accent: { bg: colors.pinkSoft, fg: colors.avatar.pink.fg },
      },
      {
        label:  'Learning Journey',
        sub:    'Reports & progress',
        icon:   BarChart3,
        screen: 'Reports',
        accent: { bg: colors.tealSoft, fg: colors.avatar.teal.fg },
      },
      {
        label:  'My Assessments',
        sub:    'View all assessments',
        icon:   ClipboardList,
        screen: 'MyAssessments',
        accent: { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg },
      },
      {
        label:  'Book Assessment',
        sub:    'Schedule a new one',
        icon:   CalendarCheck,
        screen: 'BookAssessment',
        accent: { bg: colors.orangeSoft, fg: colors.avatar.orange.fg },
      },
      {
        label:  'Enrolment',
        sub:    'Complete your forms',
        icon:   BookOpen,
        screen: 'Enrolment',
        accent: { bg: colors.greenSoft, fg: colors.avatar.green.fg },
      },
    ],
  },
  {
    title: 'Shop',
    items: [
      {
        label:  'Learning Shop',
        sub:    'Workbooks & flash cards',
        icon:   ShoppingBag,
        screen: 'LearningShop',
        accent: { bg: colors.pinkSoft, fg: colors.avatar.pink.fg },
      },
      {
        label:  'My Orders',
        sub:    'Track your purchases',
        icon:   Package,
        screen: 'MyOrders',
        accent: { bg: colors.tealSoft, fg: colors.avatar.teal.fg },
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label:  'Payments',
        sub:    'History & purchase terms',
        icon:   CircleDollarSign,
        screen: 'Payments',
        accent: { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg },
      },
      {
        label:  'Notifications',
        sub:    'Alerts & preferences',
        icon:   Bell,
        screen: 'Notifications',
        accent: { bg: colors.orangeSoft, fg: colors.avatar.orange.fg },
      },
      {
        label:  'Account Settings',
        sub:    'Profile & sign out',
        icon:   Settings,
        screen: 'Account',
        accent: { bg: colors.surface, fg: colors.muted },
      },
    ],
  },
];

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const name     = user?.fullName?.trim() || user?.firstName || 'Parent';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[hubStyles.profileCard, shadow.card]}>
      <View style={hubStyles.avatarCircle}>
        <Text style={hubStyles.avatarText}>{initials}</Text>
      </View>
      <View style={hubStyles.profileText}>
        <Text style={hubStyles.profileName}>{name}</Text>
        <Text style={hubStyles.profileRole}>Parent account</Text>
      </View>
      <TouchableOpacity onPress={onSignOut} style={hubStyles.signOutBtn} hitSlop={12}>
        <LogOut size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={hubStyles.sectionHeader}>{title}</Text>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────

function MenuRow({ item, onPress, isFirst, isLast }: {
  item: MenuItem;
  onPress: () => void;
  isFirst: boolean;
  isLast:  boolean;
}) {
  const Icon = item.icon;
  return (
    <TouchableOpacity
      style={[
        hubStyles.menuRow,
        isFirst && hubStyles.menuRowFirst,
        isLast  && hubStyles.menuRowLast,
        !isLast && hubStyles.menuRowBorder,
      ]}
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

function MoreHubScreen({ navigation }: any) {
  const { signOut } = useAuth();

  return (
    <ScrollView
      style={hubStyles.root}
      contentContainerStyle={hubStyles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <ProfileCard onSignOut={signOut} />

      {/* Sections */}
      {SECTIONS.map(section => (
        <View key={section.title} style={hubStyles.section}>
          <SectionHeader title={section.title} />

          {/* All items in one grouped card */}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const hubStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: space.lg,
    gap: space.xl,
  },

  // profile card
  profileCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             space.md,
    borderWidth:     1,
    borderColor:     colors.line,
  },
  avatarCircle: {
    width:           46,
    height:          46,
    borderRadius:    23,
    backgroundColor: colors.pinkSoft,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText: {
    fontSize:   16,
    fontWeight: '700',
    color:      colors.avatar.pink.fg,
    letterSpacing: 0.5,
  },
  profileText: { flex: 1 },
  profileName: {
    fontFamily: 'DMSans-Bold',
    fontSize:   16,
    color:      colors.ink,
    lineHeight: 21,
  },
  profileRole: {
    fontFamily: 'DMSans-Regular',
    fontSize:   12,
    color:      colors.muted,
    marginTop:  1,
  },
  signOutBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.surface,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.line,
  },

  // section
  section: { gap: space.sm },
  sectionHeader: {
    fontFamily:    'DMSans-Bold',
    fontSize:      11,
    color:         colors.mutedSoft,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: space.xs,
  },

  // grouped card
  groupCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.line,
  },

  // menu row
  menuRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               space.md,
    paddingHorizontal: space.lg,
    paddingVertical:   space.md,
    backgroundColor:   colors.card,
  },
  menuRowFirst: {
    borderTopLeftRadius:  radius.card,
    borderTopRightRadius: radius.card,
  },
  menuRowLast: {
    borderBottomLeftRadius:  radius.card,
    borderBottomRightRadius: radius.card,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBox: {
    width:          38,
    height:         38,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  menuRowText: { flex: 1 },
  menuRowLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize:   15,
    color:      colors.ink,
    lineHeight: 20,
  },
  menuRowSub: {
    fontFamily: 'DMSans-Regular',
    fontSize:   12,
    color:      colors.muted,
    marginTop:  1,
    lineHeight: 16,
  },
});

// ── Shared nav callbacks builder ─────────────────────────────────────────────
// Both the root and detail header need to navigate to Notifications / Account.
// The stack navigator's `navigation` object can navigate within the same stack.

function makeNotificationsHandler(navigation: any) {
  return () => navigation.navigate('Notifications');
}

function makeAccountHandler(navigation: any) {
  return () => navigation.navigate('Account');
}

export function ParentMoreStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        // Default for ALL screens: detail header (back arrow + title)
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
      {/* MoreHub gets the logo variant — it IS the root of this stack */}
      <Stack.Screen
        name="MoreHub"
        component={MoreHubScreen}
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

      {/* Sub-screens: title drives the detail header label */}
      <Stack.Screen name="MyChildren"    component={ChildrenPage}      options={{ title: 'My Children'       }} />
      <Stack.Screen name="ChildProfile"  component={ChildProfilePage}  options={{ title: 'Child Profile'     }} />
      <Stack.Screen name="MyAssessments" component={AssessmentsPage}   options={{ title: 'My Assessments'    }} />
      <Stack.Screen name="BookAssessment"component={BookAssessmentPage} options={{ title: 'Book Assessment'   }} />
      <Stack.Screen name="Payments"      component={PaymentsPage}       options={{ title: 'Payments'          }} />
      <Stack.Screen name="Reports"       component={ReportsPage}        options={{ title: 'Learning Journey'  }} />
      <Stack.Screen name="Enrolment"     component={EnrolmentPage}      options={{ title: 'Enrolment'         }} />
      <Stack.Screen name="LearningShop"  component={LearningShopPage}   options={{ title: 'Learning Shop'     }} />
      <Stack.Screen name="MyOrders"      component={MyOrdersPage}       options={{ title: 'My Orders'         }} />
      <Stack.Screen name="Notifications" component={NotificationsPage}  options={{ title: 'Notifications'     }} />
      <Stack.Screen name="Account"       component={AccountPage}        options={{ title: 'Account Settings'  }} />
    </Stack.Navigator>
  );
}
