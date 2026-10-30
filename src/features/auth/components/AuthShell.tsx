/**
 * AuthShell — shared layout wrapper for every auth screen.
 *
 * Renders:
 *   • Safe-area aware KeyboardAvoidingView + ScrollView
 *   • Subtle warm gradient background (matching the welcome screen palette)
 *   • Fairybread logo at the top
 *   • Optional back button (ArrowLeft)
 *   • Heading + subtitle slot
 *   • Children (form body)
 */

import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { colors, type, space, radius } from '@/theme';

interface AuthShellProps {
  /** Screen heading */
  title: string;
  /** One-line subtitle under the heading */
  subtitle?: string;
  /** Show a back arrow that calls this handler */
  onBack?: () => void;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, onBack, children }: AuthShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Gradient wash */}
      <LinearGradient
        colors={['#FFF1F5', '#FFFDF9', '#F0FBF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top + space.lg, space.xxl) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          {onBack && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              hitSlop={12}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('@/assets/brand/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Fairybread & Fractions"
            />
          </View>

          {/* Heading */}
          <View style={styles.headingWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {/* Form body */}
          <View style={styles.body}>{children}</View>

          {/* Bottom safe-area pad */}
          <View style={{ height: Math.max(insets.bottom, space.xxl) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: { flex: 1 },

  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },

  // back button
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.line,
    marginBottom:    space.lg,
    alignSelf:       'flex-start',
  },

  // logo
  logoWrap: {
    alignItems:    'center',
    marginBottom:  space.xxl,
  },
  logo: {
    height: 52,
    width:  220,
  },

  // heading
  headingWrap: {
    marginBottom: space.xl,
    alignItems:   'center',
  },
  title: {
    fontFamily:    'DMSans-SemiBold',
    fontSize:      28,
    lineHeight:    32,
    color:         colors.ink,
    marginBottom:  space.sm,
    letterSpacing: -0.5,
    textAlign:     'center',
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize:   15,
    lineHeight: 22,
    color:      colors.muted,
    textAlign:  'center',
  },

  // form
  body: {
    gap: space.md,
  },
});
