import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import { hydrateUiStorage } from '@/lib/ui-storage';
import { AuthProvider, queryClient } from '@/app/_providers';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { linking } from '@/app/navigation/linking';

SplashScreen.preventAutoHideAsync();

function RootContent() {
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

  const ready = loaded && storageReady && !fontError;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.pink} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" color={colors.pink} />}>
      <RootNavigator />
    </NavigationContainer>
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
