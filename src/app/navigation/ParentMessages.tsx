import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParentMessagesStackParamList } from './types';
import { MessagesPage } from '@/features/parent/screens/MessagesPage';
import { ChatDetailPage } from '@/features/parent/screens/ChatDetailPage';

const Stack = createNativeStackNavigator<ParentMessagesStackParamList>();

export function ParentMessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ConversationList"
        component={MessagesPage}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailPage}
      />
    </Stack.Navigator>
  );
}
