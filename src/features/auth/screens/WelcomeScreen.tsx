import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { colors, type, space, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { AuthStackProps } from '@/app/navigation/types';

export function WelcomeScreen({ navigation }: AuthStackProps<'Welcome'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Background gradient ──────────────────────────── */}
      <LinearGradient
        colors={['#FFF1F5', '#FFFDF9', '#EDF9F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Decorative circles */}
      <View style={[styles.blob, styles.blobTL]} />
      <View style={[styles.blob, styles.blobBR]} />

      {/* ── Content ──────────────────────────────────────── */}
      <View style={[styles.inner, { paddingTop: Math.max(insets.top + 24, 48) }]}>

        {/* Logo */}
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('@/assets/brand/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Fairybread & Fractions"
        />

        {/* Hero copy */}
        <View style={styles.hero}>
          <Text style={styles.tagline}>Where every student finds their magic.</Text>

          <Text style={styles.headline}>
            Learning{'\n'}
            <Text style={styles.headlineAccent}>made joyful.</Text>
          </Text>

          <Text style={styles.body}>
            Personalised tutoring, progress reports, and a community
            that truly cares about your child's growth.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pills}>
          {['Maths', 'English', 'Assessments', 'Reports'].map(label => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Bottom CTA ────────────────────────────────────── */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <Button
          label="Sign In"
          variant="primary"
          icon={ArrowRight}
          onPress={() => navigation.push('Login')}
          fullWidth
        />
        <View style={styles.ctaDivider}>
          <View style={styles.ctaLine} />
          <Text style={styles.ctaOr}>or</Text>
          <View style={styles.ctaLine} />
        </View>
        <Button
          label="Create Account"
          variant="soft"
          onPress={() => navigation.push('Signup', {})}
          fullWidth
        />
        <Text style={styles.ctaDisclaimer}>
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.paper,
  },

  // decorative blobs
  blob: {
    position:  'absolute',
    borderRadius: 999,
    opacity:   0.35,
  },
  blobTL: {
    width:  260,
    height: 260,
    top:    -80,
    left:   -80,
    backgroundColor: colors.pinkSoft,
  },
  blobBR: {
    width:  200,
    height: 200,
    bottom: 160,
    right:  -60,
    backgroundColor: colors.tealSoft,
  },

  // hero area
  inner: {
    flex:              1,
    paddingHorizontal: space.lg,
    justifyContent:    'center',
  },
  logo: {
    height:       34,
    width:        150,
    marginBottom: space.xxl,
    alignSelf:    'flex-start',
  },
  hero: {
    marginBottom: space.xl,
  },
  tagline: {
    fontFamily:    'DMSans-Medium',
    fontSize:      13,
    color:         colors.pink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom:  space.md,
  },
  headline: {
    fontFamily:    'DMSans-SemiBold',
    fontSize:      38,
    lineHeight:    44,
    color:         colors.ink,
    letterSpacing: -0.8,
    marginBottom:  space.lg,
  },
  headlineAccent: {
    color:      colors.pink,
    fontFamily: 'Fraunces-Medium',
    fontSize:   40,
    lineHeight: 46,
    fontStyle:  'italic',
  },
  body: {
    fontFamily: 'DMSans-Regular',
    fontSize:   15,
    lineHeight: 22,
    color:      colors.muted,
  },

  // feature pills
  pills: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           space.sm,
  },
  pill: {
    backgroundColor: colors.card,
    borderRadius:    radius.pill,
    paddingHorizontal: space.md,
    paddingVertical:   space.xs,
    borderWidth:     1,
    borderColor:     colors.line,
  },
  pillText: {
    fontFamily: 'DMSans-Medium',
    fontSize:   12,
    color:      colors.muted,
  },

  // CTA bottom sheet feel
  cta: {
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    paddingTop:      space.xl,
    borderTopWidth:  1,
    borderTopColor:  colors.line,
    gap:             space.sm,
    ...Platform.select({
      ios: {
        shadowColor:   '#1E2A27',
        shadowOpacity: 0.06,
        shadowRadius:  12,
        shadowOffset:  { width: 0, height: -4 },
      },
      android: { elevation: 4 },
    }),
  },
  ctaDivider: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space.md,
    marginVertical: space.xs,
  },
  ctaLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.line,
  },
  ctaOr: {
    fontFamily: 'DMSans-Medium',
    fontSize:   12,
    color:      colors.muted,
  },
  ctaDisclaimer: {
    fontFamily:  'DMSans-Regular',
    fontSize:    11,
    color:       colors.mutedSoft,
    textAlign:   'center',
    marginTop:   space.xs,
    lineHeight:  16,
  },
});
