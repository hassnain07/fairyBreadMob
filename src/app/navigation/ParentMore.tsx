import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import type { ParentMoreStackParamList } from './types';
import { PaymentsPage } from '@/features/parent/screens/PaymentsPage';
import { ChildrenPage } from '@/features/parent/screens/ChildrenPage';
import { NotificationsPage } from '@/features/parent/screens/NotificationsPage';
import { AssessmentsPage } from '@/features/parent/screens/AssessmentsPage';
import { BookAssessmentPage } from '@/features/parent/screens/BookAssessmentPage';
import { ReportsPage } from '@/features/parent/screens/ReportsPage';
import { EnrolmentPage } from '@/features/parent/screens/EnrolmentPage';
import { LearningShopPage } from '@/features/parent/screens/LearningShopPage';
import { MyOrdersPage } from '@/features/parent/screens/MyOrdersPage';
import { AccountPage } from '@/features/parent/screens/AccountPage';

const Stack = createNativeStackNavigator<ParentMoreStackParamList>();

function MoreHubScreen({ navigation }: any) {
  const menuItems = [
    { label: 'My Children', icon: '👨‍👧', screen: 'MyChildren' },
    { label: 'My Assessments', icon: '📋', screen: 'MyAssessments' },
    { label: 'Book Assessment', icon: '📅', screen: 'BookAssessment' },
    { label: 'Learning Journey', icon: '📊', screen: 'Reports' },
    { label: 'Learning Shop', icon: '🛍️', screen: 'LearningShop' },
    { label: 'My Orders', icon: '📦', screen: 'MyOrders' },
    { label: 'Payments', icon: '💳', screen: 'Payments' },
    { label: 'Account Settings', icon: '⚙️', screen: 'Account' },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications' },
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
        Manage your account and access all features.
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

export function ParentMoreStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MoreHub"
        component={MoreHubScreen}
      />
      <Stack.Screen
        name="MyChildren"
        component={ChildrenPage}
      />
      <Stack.Screen
        name="MyAssessments"
        component={AssessmentsPage}
      />
      <Stack.Screen
        name="BookAssessment"
        component={BookAssessmentPage}
      />
      <Stack.Screen
        name="Payments"
        component={PaymentsPage}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsPage}
      />
      <Stack.Screen
        name="Enrolment"
        component={EnrolmentPage}
      />
      <Stack.Screen
        name="LearningShop"
        component={LearningShopPage}
      />
      <Stack.Screen
        name="MyOrders"
        component={MyOrdersPage}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsPage}
      />
      <Stack.Screen
        name="Account"
        component={AccountPage}
      />
    </Stack.Navigator>
  );
}
