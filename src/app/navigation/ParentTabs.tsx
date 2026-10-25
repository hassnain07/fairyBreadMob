import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  MessageCircle,
  Menu,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { ParentTabParamList } from './types';
import { BookClassPage } from '@/features/parent/screens/BookClassPage';
import { BookingsPage } from '@/features/parent/screens/BookingsPage';
import { ParentMoreStack } from './ParentMore';
import { ParentMessagesStack } from './ParentMessages';
import { ParentHomeScreen } from '@/features/parent/screens/ParentHomeScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();

export function ParentTabs() {
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
        name="ParentHome"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Book"
        component={BookClassPage}
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsPage}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ticket size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ParentMessagesStack}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ParentMore"
        component={ParentMoreStack}
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
