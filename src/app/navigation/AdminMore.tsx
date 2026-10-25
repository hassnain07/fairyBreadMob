import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import type { AdminMoreStackParamList } from './types';
import { NotificationsPage } from '@/features/parent/screens/NotificationsPage';
import { AccountPage } from '@/features/parent/screens/AccountPage';
import { AdminTutorsPage } from '@/features/admin/screens/AdminTutorsPage';
import { AdminParentsPage } from '@/features/admin/screens/AdminParentsPage';
import { AdminTimetablePage } from '@/features/admin/screens/AdminTimetablePage';
import { AdminAssessmentsPage } from '@/features/admin/screens/AdminAssessmentsPage';
import { AdminProgramsPage } from '@/features/admin/screens/AdminProgramsPage';
import { AdminFamilyBookingPage } from '@/features/admin/screens/AdminFamilyBookingPage';
import { AdminShopOrdersPage } from '@/features/admin/screens/AdminShopOrdersPage';
import { AdminShopProductsPage } from '@/features/admin/screens/AdminShopProductsPage';
import { AdminSettingsPage } from '@/features/admin/screens/AdminSettingsPage';
import { AdminMyTeachingPage } from '@/features/admin/screens/AdminMyTeachingPage';

const Stack = createNativeStackNavigator<AdminMoreStackParamList>();

function AdminMoreHubScreen({ navigation }: any) {
  const menuItems = [
    { label: 'Family Booking', icon: '👶', screen: 'FamilyBooking' },
    { label: 'Tutors', icon: '👨‍🏫', screen: 'Tutors' },
    { label: 'Parents', icon: '👨‍👩‍👧‍👦', screen: 'Parents' },
    { label: 'Timetable', icon: '📅', screen: 'Timetable' },
    { label: 'Assessments', icon: '📋', screen: 'Assessments' },
    { label: 'Programs', icon: '📚', screen: 'Programs' },
    { label: 'Shop Orders', icon: '🛍️', screen: 'ShopOrders' },
    { label: 'Shop Products', icon: '📦', screen: 'ShopProducts' },
    { label: 'Settings', icon: '⚙️', screen: 'Settings' },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { label: 'Account', icon: '👤', screen: 'Account' },
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.screen}
      style={[styles.menuItem, shadow.card as object]}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text style={[type.h3, { color: colors.ink, marginLeft: space.md }]}>
          {item.label}
        </Text>
      </View>
      <ChevronRight size={20} color={colors.muted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
        More
      </Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Access additional admin features.
      </Text>

      <View style={{ gap: space.md }}>
        {menuItems.map(renderMenuItem)}
      </View>
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
  menuItem: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
  },
});

export function AdminMoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreHub" component={AdminMoreHubScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="FamilyBooking" component={AdminFamilyBookingPage} options={{ title: 'Family Booking' }} />
      <Stack.Screen name="MyTeaching" component={AdminMyTeachingPage} options={{ title: 'My Teaching' }} />
      <Stack.Screen name="Tutors" component={AdminTutorsPage} options={{ title: 'Tutors' }} />
      <Stack.Screen name="Parents" component={AdminParentsPage} options={{ title: 'Parents' }} />
      <Stack.Screen name="Timetable" component={AdminTimetablePage} options={{ title: 'Timetable' }} />
      <Stack.Screen name="Assessments" component={AdminAssessmentsPage} options={{ title: 'Assessments' }} />
      <Stack.Screen name="Programs" component={AdminProgramsPage} options={{ title: 'Programs' }} />
      <Stack.Screen name="ShopOrders" component={AdminShopOrdersPage} options={{ title: 'Shop Orders' }} />
      <Stack.Screen name="ShopProducts" component={AdminShopProductsPage} options={{ title: 'Shop Products' }} />
      <Stack.Screen name="Settings" component={AdminSettingsPage} options={{ title: 'Settings' }} />
      <Stack.Screen name="Notifications" component={NotificationsPage} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Account" component={AccountPage} options={{ title: 'Account' }} />
    </Stack.Navigator>
  );
}
