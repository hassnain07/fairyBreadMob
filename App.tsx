import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/theme';
import { hydrateUiStorage } from '@/lib/ui-storage';
import { AuthProvider, queryClient } from '@/app/_providers';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { linking } from '@/app/navigation/linking';
import { SplashScreen } from '@/components/layout/SplashScreen';

// Keep the native splash screen up until we manually hide it
ExpoSplashScreen.preventAutoHideAsync();

function RootContent() {
  const [fontsLoaded, fontError] = useFonts({
    'DMSans-Regular':   require('@/assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':    require('@/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold':  require('@/assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold':      require('@/assets/fonts/DMSans-Bold.ttf'),
    'Fraunces-Medium':  require('@/assets/fonts/Fraunces_72pt-Regular.ttf'),
    'Fraunces-SemiBold':require('@/assets/fonts/Fraunces_72pt-SemiBold.ttf'),
  });

  const [storageReady,  setStorageReady]  = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);

  // Hydrate storage
  useEffect(() => {
    hydrateUiStorage()
      .catch(() => {})
      .finally(() => setStorageReady(true));
  }, []);

  const appReady = (fontsLoaded || !!fontError) && storageReady;

  // Hide native splash + trigger our in-app splash fade-out once ready
  useEffect(() => {
    if (appReady) {
      ExpoSplashScreen.hideAsync();
      // Small delay so the transition feels deliberate, not jarring
      const t = setTimeout(() => setSplashVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [appReady]);

  return (
    <>
      <StatusBar style="dark" />

      {/* App content — rendered underneath the splash */}
      {appReady && (
        <NavigationContainer
          linking={linking}
        >
          <RootNavigator />
        </NavigationContainer>
      )}

      {/* In-app splash — sits on top, fades out once appReady */}
      {splashMounted && (
        <SplashScreen
          visible={splashVisible}
          onHidden={() => setSplashMounted(false)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootContent />
            </AuthProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
