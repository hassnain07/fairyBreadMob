import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Ticket,
  CreditCard,
  MessageCircle,
  Menu,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { AdminTabParamList } from './types';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { AdminMoreStack } from './AdminMore';
import { AdminHomeScreen } from '@/features/admin/screens/AdminHomeScreen';

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
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminBookings"
        component={() => <PlaceholderScreen title="Bookings" icon="🎫" />}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ticket size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Payments"
        component={() => <PlaceholderScreen title="Payments" icon="💰" />}
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <CreditCard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={() => <PlaceholderScreen title="Messages" icon="💬" />}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMore"
        component={AdminMoreStack}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Menu size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    height: 60 + space.md,
    paddingBottom: space.md,
  },
  tabBarLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: 4,
  },
});
