import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, ClipboardList, Users, MessageCircle, Menu } from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { TeacherTabParamList } from './types';
import { TeacherHomeScreen } from '@/features/teacher/screens/TeacherHomeScreen';
import { AttendancePage } from '@/features/teacher/screens/AttendancePage';
import { TeacherStudentsPage } from '@/features/teacher/screens/TeacherStudentsPage';
import { TeacherMessagesPage } from '@/features/teacher/screens/TeacherMessagesPage';
import { TeacherMoreStack } from './TeacherMore';

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
        sceneContainerStyle: { backgroundColor: colors.paper, paddingBottom: 0 },
      }}
    >
      <Tab.Screen
        name="TeacherHome"
        component={TeacherHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendancePage}
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Students"
        component={TeacherStudentsPage}
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={TeacherMessagesPage}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={TeacherMoreStack}
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
