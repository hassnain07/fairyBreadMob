import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Ticket, CreditCard, MessageCircle, Menu } from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { AdminTabParamList } from './types';
import { AdminHomeScreen } from '@/features/admin/screens/AdminHomeScreen';
import { AdminBookingsPage } from '@/features/admin/screens/AdminBookingsPage';
import { AdminPaymentsPage } from '@/features/admin/screens/AdminPaymentsPage';
import { AdminMessagesStack } from './AdminMessages';
import { AdminMoreStack } from './AdminMore';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminBookings"
        component={AdminBookingsPage}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminPayments"
        component={AdminPaymentsPage}
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminMessages"
        component={AdminMessagesStack}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminMore"
        component={AdminMoreStack}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    height: 60,
    paddingBottom: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    marginTop: space.xs,
    marginBottom: space.xs,
  },
  tabBarIcon: {
    marginTop: space.xs,
  },
});
