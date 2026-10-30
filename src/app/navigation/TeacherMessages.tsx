import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TeacherMessagesStackParamList } from './types';
import { TeacherMessagesPage } from '@/features/teacher/screens/TeacherMessagesPage';
import { ChatDetailPage }      from '@/features/parent/screens/ChatDetailPage';

const Stack = createNativeStackNavigator<TeacherMessagesStackParamList>();

export function TeacherMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeacherConversationList" component={TeacherMessagesPage} />
      <Stack.Screen name="TeacherChat"             component={ChatDetailPage as any} />
    </Stack.Navigator>
  );
}
