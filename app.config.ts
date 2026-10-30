import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Fairybread & Fractions',
  slug: 'fairybread-mobile',
  version: '1.0.0',
  scheme: 'fairybread',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './src/assets/brand/icon-1024.png',
  updates: {
    enabled: false,
  },
  ios: {
    bundleIdentifier: 'au.fairybread.app',
    supportsTablet: true,
    // googleServicesFile: './GoogleService-Info.plist',   // uncomment when Firebase is ready
    infoPlist: {
      NSCameraUsageDescription: 'To take a photo of your payment proof or product.',
      NSPhotoLibraryUsageDescription: 'To attach proof of payment or product photos.',
    },
  },
  android: {
    package: 'au.fairybread.app',
    // googleServicesFile: './google-services.json',       // uncomment when Firebase is ready
    softwareKeyboardLayoutMode: 'resize',
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'CAMERA', 'POST_NOTIFICATIONS'],
    adaptiveIcon: {
      foregroundImage: './src/assets/brand/adaptive-foreground.png',
      backgroundColor: '#FFFDF9',
    },
    allowBackup: false,
  },
  plugins: [
    'expo-secure-store',
    ['expo-splash-screen', {
      image:           './src/assets/brand/splash-logo.png',
      backgroundColor: '#FFFDF9',
      imageWidth:      220,
      resizeMode:      'contain',
    }],
    ['expo-image-picker', { photosPermission: 'To attach proof of payment or product photos.', cameraPermission: 'To take a photo of your payment proof or product.' }],
    // Phase A: no expo-font plugin (it doesn't apply in Expo Go)
    // Phase A: no Firebase plugin yet
  ],
  extra: { 
    // eas: { projectId: 'xxx' },  // not needed for local Expo Go development
  },
};

export default config;
