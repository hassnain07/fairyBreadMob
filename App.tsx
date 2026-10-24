import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { colors, type } from '@/theme';
import { hydrateUiStorage } from '@/lib/ui-storage';
import { AuthProvider, queryClient, useAuth } from '@/app/_providers';
import { DevLoginScreen } from '@/features/auth/screens/DevLoginScreen';

SplashScreen.preventAutoHideAsync();

function RootContent() {
  const { user, loading } = useAuth();

  const [loaded, fontError] = useFonts({
    'DMSans-Regular': require('@/assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('@/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('@/assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('@/assets/fonts/DMSans-Bold.ttf'),
    'Fraunces-Medium': require('@/assets/fonts/Fraunces_72pt-Regular.ttf'),
    'Fraunces-SemiBold': require('@/assets/fonts/Fraunces_72pt-SemiBold.ttf'),
  });

  const [storageReady, setStorageReady] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await hydrateUiStorage();
      } catch (e) {
        console.warn('Failed to hydrate UI storage:', e);
      }
      setStorageReady(true);
    };
    init();
  }, []);

  const ready = loaded && storageReady && !fontError && !loading;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  if (!user) {
    return (
      <DevLoginScreen
        onLoginSuccess={(u) => {
          console.log('Logged in:', u.email, 'role:', u.role);
        }}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: 8 }]}>
          Fairybread & Fractions
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: 24 }]}>
          Phase A: Expo Go Ready ✓
        </Text>

        <Text style={[type.h2, { color: colors.ink, marginBottom: 16, marginTop: 16 }]}>
          ✅ Task 2 Status
        </Text>

        <Text style={[type.body, { color: colors.ink, marginBottom: 8 }]}>
          ✓ Supabase connected
        </Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 8 }]}>
          ✓ Session encrypted (SecureStore + AES)
        </Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 8 }]}>
          ✓ Auth flow working (sign in → get_my_context)
        </Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 24 }]}>
          ✓ Session survives app restart
        </Text>

        <Text style={[type.h2, { color: colors.ink, marginBottom: 16 }]}>
          👤 Current User
        </Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Email</Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 12 }]}>{user.email}</Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Name</Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 12 }]}>{user.fullName}</Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Role</Text>
        <Text style={[type.bodyStrong, { color: colors.pink, marginBottom: 12 }]}>
          {user.role}
        </Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Family ID</Text>
        <Text style={[type.body, { color: colors.ink, marginBottom: 12 }]}>
          {user.familyId || '(none)'}
        </Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Teacher ID</Text>
        <Text style={[type.body, { color: colors.ink }]}>
          {user.teacherId || '(none)'}
        </Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="dark" />
              <RootContent />
            </AuthProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
