import { Platform, ViewStyle } from 'react-native';

export const shadow = {
  card: Platform.select({
    ios:     { shadowColor: '#23312F', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 1.5 },
  }) as ViewStyle,
  float: Platform.select({
    ios:     { shadowColor: '#23312F', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 6 },
  }) as ViewStyle,
  sheet: Platform.select({
    ios:     { shadowColor: '#1E2A27', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: -8 } },
    android: { elevation: 16 },
  }) as ViewStyle,
} as const;
