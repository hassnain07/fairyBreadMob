import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import type { TeacherMoreStackParamList } from './types';
import { TeacherAssessmentsPage } from '@/features/teacher/screens/TeacherAssessmentsPage';
import { TeacherReportsPage } from '@/features/teacher/screens/TeacherReportsPage';
import { NotificationsPage } from '@/features/parent/screens/NotificationsPage';
import { AccountPage } from '@/features/parent/screens/AccountPage';

const Stack = createNativeStackNavigator<TeacherMoreStackParamList>();

function TeacherMoreHubScreen({ navigation }: any) {
  const menuItems = [
    { label: 'My Classes', icon: '📚', screen: 'MyClasses' },
    { label: 'Assessments', icon: '📋', screen: 'Assessments' },
    { label: 'Reports', icon: '📊', screen: 'Reports' },
    { label: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { label: 'Account Settings', icon: '⚙️', screen: 'Account' },
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
        Access additional features.
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

export function TeacherMoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeacherMoreHub" component={TeacherMoreHubScreen} />
      <Stack.Screen name="Assessments" component={TeacherAssessmentsPage} />
      <Stack.Screen name="Reports" component={TeacherReportsPage} />
      <Stack.Screen name="Notifications" component={NotificationsPage} />
      <Stack.Screen name="Account" component={AccountPage} />
      <Stack.Screen name="MyClasses" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}

function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }}>
      <Text style={[type.h3, { color: colors.muted }]}>My Classes</Text>
    </View>
  );
}
