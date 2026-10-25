import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AdminMessagesStackParamList } from './types';
import { AdminMessagesPage } from '@/features/admin/screens/AdminMessagesPage';
import { ChatDetailPage } from '@/features/parent/screens/ChatDetailPage';

const Stack = createNativeStackNavigator<AdminMessagesStackParamList>();

export function AdminMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessageList" component={AdminMessagesPage} />
      <Stack.Screen name="ChatDetail" component={ChatDetailPage} options={{ title: 'Chat' }} />
    </Stack.Navigator>
  );
}
