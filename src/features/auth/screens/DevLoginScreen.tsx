import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { colors, type } from '@/theme';
import { dataClient } from '@/lib/data/client';
import type { AuthUser } from '@/types/auth';

interface DevLoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export function DevLoginScreen({ onLoginSuccess }: DevLoginScreenProps) {
  const [email, setEmail] = useState('jessica@fairybread.au');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const handleLogin = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    setLoading(true);
    try {
      const u = await dataClient.signIn(email, password);
      setUser(u);
      onLoginSuccess(u);
    } catch (err) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await dataClient.signOut();
      setUser(null);
      setPassword('');
      setEmail('jessica@fairybread.au');
    } catch (err) {
      Alert.alert('Sign Out Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (user) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.paper }]}>
        <View style={styles.card}>
          <Text style={[type.h1, { color: colors.ink, marginBottom: 16 }]}>Signed In ✓</Text>

          <View style={styles.infoSection}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Email</Text>
            <Text style={[type.body, { color: colors.ink }]}>{user.email}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Role</Text>
            <Text style={[type.bodyStrong, { color: colors.pink }]}>{user.role}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Family ID</Text>
            <Text style={[type.body, { color: colors.ink }]}>{user.familyId || '(none)'}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Teacher ID</Text>
            <Text style={[type.body, { color: colors.ink }]}>{user.teacherId || '(none)'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.pink }]}
            onPress={handleSignOut}
          >
            <Text style={[type.button, { color: colors.card }]}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[type.caption, { color: colors.muted, marginTop: 16, textAlign: 'center' }]}>
            Session will persist after app restart.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={styles.card}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: 8 }]}>Dev Login</Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: 24 }]}>
          Test Supabase authentication
        </Text>

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4 }]}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="jessica@fairybread.au"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: 4, marginTop: 12 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.pink, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={[type.button, { color: colors.card }]}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Text style={[type.caption, { color: colors.muted, marginTop: 24, textAlign: 'center' }]}>
          Seed user: jessica@fairybread.au
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  infoSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
