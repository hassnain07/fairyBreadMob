import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MessageCircle,
  Menu,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { TeacherTabParamList } from './types';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { TeacherMoreStack } from './TeacherMore';
import { TeacherHomeScreen } from '@/features/teacher/screens/TeacherHomeScreen';

const Tab = createBottomTabNavigator<TeacherTabParamList>();

export function TeacherTabs() {
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
        name="TeacherHome"
        component={TeacherHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={() => <PlaceholderScreen title="Attendance" icon="✓" />}
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={() => <PlaceholderScreen title="My Students" icon="👥" />}
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
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
        name="TeacherMore"
        component={TeacherMoreStack}
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
