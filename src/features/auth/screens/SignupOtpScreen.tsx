import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, type, space } from '@/theme';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/_providers';
import type { AuthStackProps } from '@/app/navigation/types';
import { dataClient } from '@/lib/data/client';

export function SignupOtpScreen({
  route,
  navigation,
}: AuthStackProps<'SignupOtp'>) {
  const { email, firstName, lastName, phone } = route.params;
  const { signIn, setInAuthFlow } = useAuth();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    setInAuthFlow(true);
    return () => setInAuthFlow(false);
  }, [setInAuthFlow]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await dataClient.verifyOtp(email, otp, 'signup');
      // Just proceed to password screen. The signup session is temporary.
      setStep('password');
    } catch (e: any) {
      const message = e?.message || 'Invalid or expired code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await dataClient.setPassword(password);
      // Now sign in with the new account
      await signIn(email, password);
    } catch (e: any) {
      const message = e?.message || 'Failed to set password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await dataClient.requestSignupOtp({ email, firstName, lastName, phone });
      setResendCountdown(60);
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      const message = e?.message || 'Failed to resend code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'password') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('otp')}>
            <Text style={[type.button, { color: colors.pink }]}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
            Create password
          </Text>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.xxl }]}>
            Choose a strong password for your account.
          </Text>

          {error && (
            <View style={styles.error}>
              <Text style={[type.small, { color: colors.status.danger.fg }]}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Enter password (min 8 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <Button
            label="Complete Sign Up"
            variant="primary"
            onPress={handleSetPassword}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[type.button, { color: colors.pink }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
          Verify your email
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
          We sent a 6-digit code to{'\n'}
          <Text style={{ fontWeight: '600' }}>{email}</Text>
        </Text>

        {error && (
          <View style={styles.error}>
            <Text style={[type.small, { color: colors.status.danger.fg }]}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          editable={!loading}
          textAlign="center"
        />

        <Button
          label="Verify"
          variant="primary"
          onPress={handleVerifyOtp}
          loading={loading}
          style={{ marginBottom: space.lg }}
        />

        <View style={styles.resend}>
          <Text style={[type.small, { color: colors.muted }]}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCountdown > 0 || loading}
          >
            <Text
              style={[
                type.small,
                { color: resendCountdown > 0 ? colors.muted : colors.pink, fontWeight: '600' },
              ]}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.xxl,
  },
  header: {
    marginBottom: space.xxl,
  },
  form: {
    flex: 1,
  },
  error: {
    backgroundColor: colors.status.danger.bg,
    borderRadius: 8,
    padding: space.md,
    marginBottom: space.lg,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    fontSize: 28,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: space.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    fontSize: 15,
    color: colors.ink,
    marginBottom: space.lg,
  },
  resend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
});
