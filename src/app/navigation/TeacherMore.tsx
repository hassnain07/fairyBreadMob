import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme';
import type { TeacherMoreStackParamList } from './types';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

const Stack = createNativeStackNavigator<TeacherMoreStackParamList>();

export function TeacherMoreStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MoreHub"
        component={() => <PlaceholderScreen title="More" icon="⋯" />}
      />
      <Stack.Screen
        name="MyClasses"
        component={() => <PlaceholderScreen title="My Classes" icon="📚" />}
      />
      <Stack.Screen
        name="Assessments"
        component={() => <PlaceholderScreen title="Assessments" icon="📋" />}
      />
      <Stack.Screen
        name="Reports"
        component={() => <PlaceholderScreen title="Student Reports" icon="📊" />}
      />
      <Stack.Screen
        name="Notifications"
        component={() => <PlaceholderScreen title="Notifications" icon="🔔" />}
      />
      <Stack.Screen
        name="Account"
        component={() => <PlaceholderScreen title="Account" icon="👤" />}
      />
    </Stack.Navigator>
  );
}
