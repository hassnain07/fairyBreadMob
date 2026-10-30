/**
 * SplashScreen
 *
 * In-app branded splash shown while fonts + storage load.
 * Fades out smoothly once the app is ready via the `visible` prop.
 *
 * Layout:
 *   • Full-screen warm gradient (paper → pink-soft → teal-soft)
 *   • Decorative blobs (top-right, bottom-left)
 *   • Logo centred, scales up on mount
 *   • Tagline fades in with a slight delay
 *   • Three animated dot indicators at the bottom
 *   • Whole screen fades out when `visible` → false
 */

import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SplashScreenProps {
  /** When false the screen fades out and calls onHidden once done. */
  visible: boolean;
  /** Called after the exit animation completes. */
  onHidden: () => void;
}

// ── Animated dot ──────────────────────────────────────────────────────────────

function Dot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0.6, { duration: 420, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   interpolate(scale.value, [0.6, 1], [0.35, 1]),
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export function SplashScreen({ visible, onHidden }: SplashScreenProps) {
  const insets   = useSafeAreaInsets();
  const opacity  = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(
        0,
        { duration: 400, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onHidden)();
        },
      );
    }
  }, [visible, opacity, onHidden]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.root, containerStyle]} pointerEvents="none">
      {/* ── Gradient background ──────────────────────────── */}
      <LinearGradient
        colors={['#FFFDF9', '#FFF1F5', '#EDF9F6']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Decorative blobs ─────────────────────────────── */}
      <View style={[styles.blob, styles.blobTR]} />
      <View style={[styles.blob, styles.blobBL]} />

      {/* ── Centre content ───────────────────────────────── */}
      <View style={styles.center}>
        {/* Logo — scales in on mount */}
        <Animated.View entering={ZoomIn.duration(500).easing(Easing.out(Easing.back(1.4)))}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('@/assets/brand/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Fairybread & Fractions"
          />
        </Animated.View>

        {/* Tagline — fades in after logo */}
        <Animated.Text
          style={styles.tagline}
          entering={FadeIn.delay(300).duration(500)}
        >
          Where every student finds their magic.
        </Animated.Text>
      </View>

      {/* ── Loading dots ─────────────────────────────────── */}
      <Animated.View
        style={[styles.dotsRow, { paddingBottom: Math.max(insets.bottom + space.xxl, 52) }]}
        entering={FadeIn.delay(600).duration(400)}
      >
        <Dot delay={0}   />
        <Dot delay={160} />
        <Dot delay={320} />
      </Animated.View>

      {/* ── Version / branding footer ────────────────────── */}
      <Animated.Text
        style={[styles.footer, { bottom: Math.max(insets.bottom, space.lg) }]}
        entering={FadeIn.delay(700).duration(400)}
      >
        Fairybread &amp; Fractions
      </Animated.Text>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex:          9999,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // decorative blobs
  blob: {
    position:     'absolute',
    borderRadius: 999,
    opacity:      0.45,
  },
  blobTR: {
    width:  260,
    height: 260,
    top:    -70,
    right:  -70,
    backgroundColor: colors.pinkSoft,
  },
  blobBL: {
    width:  200,
    height: 200,
    bottom: 80,
    left:   -60,
    backgroundColor: colors.tealSoft,
  },

  // logo
  center: {
    alignItems: 'center',
    gap:        space.lg,
  },
  logo: {
    width:  200,
    height: 50,
    ...Platform.select({
      ios: {
        shadowColor:   colors.pink,
        shadowOpacity: 0.15,
        shadowRadius:  20,
        shadowOffset:  { width: 0, height: 4 },
      },
    }),
  },

  // tagline
  tagline: {
    fontFamily:  'DMSans-Regular',
    fontSize:    15,
    lineHeight:  22,
    color:       colors.muted,
    textAlign:   'center',
    letterSpacing: 0.1,
    maxWidth:    240,
  },

  // loading dots
  dotsRow: {
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            space.md,
  },
  dot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.pink,
  },

  // footer
  footer: {
    position:    'absolute',
    left:        0,
    right:       0,
    fontFamily:  'DMSans-Medium',
    fontSize:    11,
    color:       colors.mutedSoft,
    textAlign:   'center',
    letterSpacing: 0.4,
  },
});
