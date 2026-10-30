import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Users,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { TeacherTabParamList } from './types';
import { TeacherHomeScreen }    from '@/features/teacher/screens/TeacherHomeScreen';
import { AttendancePage }       from '@/features/teacher/screens/AttendancePage';
import { TeacherStudentsPage }  from '@/features/teacher/screens/TeacherStudentsPage';
import { TeacherMoreStack }     from './TeacherMore';
import { TeacherMessagesStack } from './TeacherMessages';
import { AppHeader }            from '@/components/layout/AppHeader';

const Tab = createBottomTabNavigator<TeacherTabParamList>();

/** Build the header for tab screens — teal accent for teacher role. */
function makeHeader(navigation: any) {
  return (props: any) => (
    <AppHeader
      {...props}
      onNotifications={() => navigation.navigate('More')}
      onAccount={() => navigation.navigate('More')}
    />
  );
}

export function TeacherTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: makeHeader(navigation),

        tabBarStyle:             styles.tabBar,
        tabBarLabelStyle:        styles.tabBarLabel,
        tabBarIconStyle:         styles.tabBarIcon,
        tabBarActiveTintColor:   colors.teal,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen
        name="TeacherHome"
        component={TeacherHomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendancePage}
        options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Students"
        component={TeacherStudentsPage}
        options={{ title: 'Students', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={TeacherMessagesStack}
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }}
      />
      <Tab.Screen
        name="More"
        component={TeacherMoreStack}
        options={{
          headerShown: false,  // More stack manages its own header
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
    borderTopColor:  colors.line,
    borderTopWidth:  1,
    height:          60 + space.md,
    paddingBottom:   space.md,
  },
  tabBarLabel: {
    ...type.caption,
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: 4,
  },
});
