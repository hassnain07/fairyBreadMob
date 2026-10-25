import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, space } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { AuthStackProps } from '@/app/navigation/types';

export function WelcomeScreen({ navigation }: AuthStackProps<'Welcome'>) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={['#FFF1F5', '#FFF9E3', '#F0FBF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <View style={styles.hero}>
        <Text style={[type.display, { color: colors.ink, marginBottom: space.md }]}>
          fairybread
        </Text>
        <Text style={[type.display, { color: colors.ink, marginBottom: space.lg }]}>
          & fractions
        </Text>

        <Text
          style={[
            type.body,
            {
              color: colors.muted,
              marginBottom: space.xxl,
              lineHeight: 24,
            },
          ]}
        >
          Welcome to your learning community. Where every student finds their magic.
        </Text>

        <Button
          label="Sign In"
          variant="primary"
          onPress={() => navigation.push('Login')}
          style={{ marginBottom: space.md }}
        />

        <Button
          label="Create Account"
          variant="secondary"
          onPress={() => navigation.push('Signup', {})}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xxl,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    opacity: 0.5,
  },
  hero: {
    alignItems: 'center',
  },
});
