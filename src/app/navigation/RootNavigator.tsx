import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';
import type { RootStackParamList } from './types';
import { useAuth } from '../_providers';
import { AuthStack } from './AuthStack';
import { ParentTabs } from './ParentTabs';
import { TeacherTabs } from './TeacherTabs';
import { AdminTabs } from './AdminTabs';

export function RootNavigator() {
  const { user, loading, inAuthFlow } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.pink} />
      </View>
    );
  }

  // If no user OR we're in an auth flow (OTP, password reset), show auth stack
  if (!user || inAuthFlow) {
    return <AuthStack />;
  }

  switch (user.role) {
    case 'parent':
      return <ParentTabs />;
    case 'teacher':
      return <TeacherTabs />;
    case 'admin':
      return <AdminTabs />;
    default:
      return <AuthStack />;
  }
}
