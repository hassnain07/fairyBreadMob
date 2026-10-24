import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colors, type } from '@/theme';
import { hydrateUiStorage } from '@/lib/ui-storage';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [loaded, fontError] = useFonts({
    'DMSans-Regular': require('@/assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('@/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('@/assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('@/assets/fonts/DMSans-Bold.ttf'),
    'Fraunces-Medium': require('@/assets/fonts/Fraunces-Medium.ttf'),
    'Fraunces-SemiBold': require('@/assets/fonts/Fraunces-SemiBold.ttf'),
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
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
            <Text style={[type.h1, { color: colors.ink, marginBottom: 16 }]}>
              Fairybread & Fractions
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Phase A: Expo Go Ready
            </Text>
          </View>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
