import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme';
import type { AdminMoreStackParamList } from './types';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

const Stack = createNativeStackNavigator<AdminMoreStackParamList>();

export function AdminMoreStack() {
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
        name="FamilyBooking"
        component={() => <PlaceholderScreen title="Family Booking" icon="👨‍👩‍👧" />}
      />
      <Stack.Screen
        name="MyTeaching"
        component={() => <PlaceholderScreen title="My Teaching" icon="📚" />}
      />
      <Stack.Screen
        name="Tutors"
        component={() => <PlaceholderScreen title="Tutors" icon="👨‍🏫" />}
      />
      <Stack.Screen
        name="Parents"
        component={() => <PlaceholderScreen title="Parents" icon="👪" />}
      />
      <Stack.Screen
        name="Timetable"
        component={() => <PlaceholderScreen title="Timetable" icon="📅" />}
      />
      <Stack.Screen
        name="Assessments"
        component={() => <PlaceholderScreen title="Assessments" icon="📋" />}
      />
      <Stack.Screen
        name="Programs"
        component={() => <PlaceholderScreen title="Programs" icon="🎓" />}
      />
      <Stack.Screen
        name="ShopOrders"
        component={() => <PlaceholderScreen title="Shop Orders" icon="📦" />}
      />
      <Stack.Screen
        name="ShopProducts"
        component={() => <PlaceholderScreen title="Shop Products" icon="🛍️" />}
      />
      <Stack.Screen
        name="Settings"
        component={() => <PlaceholderScreen title="Settings" icon="⚙️" />}
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
