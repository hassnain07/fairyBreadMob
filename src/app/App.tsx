import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
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
          <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
              <Text style={[type.h1, { color: colors.ink, marginBottom: 8 }]}>
                Fairybread & Fractions
              </Text>
              <Text style={[type.body, { color: colors.muted, marginBottom: 24 }]}>
                Phase A: Expo Go Ready
              </Text>

              {/* Font Test */}
              <Text style={[type.h2, { color: colors.ink, marginBottom: 16, marginTop: 16 }]}>
                Font Tests
              </Text>

              <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: colors.ink, marginBottom: 8 }}>
                ✓ DMSans-Regular
              </Text>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: colors.ink, marginBottom: 8 }}>
                ✓ DMSans-Medium
              </Text>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.ink, marginBottom: 8 }}>
                ✓ DMSans-SemiBold
              </Text>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.ink, marginBottom: 8 }}>
                ✓ DMSans-Bold
              </Text>
              <Text style={{ fontFamily: 'Fraunces-Medium', fontSize: 16, color: colors.pink, marginBottom: 8 }}>
                ✓ Fraunces-Medium
              </Text>
              <Text style={{ fontFamily: 'Fraunces-SemiBold', fontSize: 16, color: colors.pink, marginBottom: 24 }}>
                ✓ Fraunces-SemiBold
              </Text>

              <Text style={[type.caption, { color: colors.muted }]}>
                All 6 fonts loaded successfully.
              </Text>
            </View>
          </ScrollView>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

