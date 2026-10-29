import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type, space, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/app/_providers';
import { AuthShell } from '../components/AuthShell';
import { AuthFooterRow } from '../components/AuthFooterRow';
import { OtpInput } from '../components/OtpInput';
import type { AuthStackProps } from '@/app/navigation/types';
import { dataClient } from '@/lib/data/client';

export function SignupOtpScreen({ route, navigation }: AuthStackProps<'SignupOtp'>) {
  const { email, firstName, lastName, phone } = route.params;
  const { signIn, setInAuthFlow } = useAuth();

  const [step,    setStep]    = useState<'otp' | 'password'>('otp');
  const [otp,     setOtp]     = useState('');
  const [password, setPassword] = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setInAuthFlow(true);
    return () => setInAuthFlow(false);
  }, [setInAuthFlow]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(null); setLoading(true);
    try {
      await dataClient.verifyOtp(email, otp, 'signup');
      setStep('password');
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired code. Please try again.');
    } finally { setLoading(false); }
  };

  const handleSetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(null); setLoading(true);
    try {
      await dataClient.setPassword(password);
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || 'Failed to set password. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(null); setLoading(true);
    try {
      await dataClient.requestSignupOtp({ email, firstName, lastName, phone });
      setCountdown(60);
    } catch (e: any) {
      setError(e?.message || 'Failed to resend code.');
    } finally { setLoading(false); }
  };

  // ── Step: set password ─────────────────────────────────────────────────────
  if (step === 'password') {
    return (
      <AuthShell
        title="Create password."
        subtitle="Choose a strong password for your account."
        onBack={() => { setStep('otp'); setError(null); }}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label="Password"
          variant="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          helperText="Use a mix of letters, numbers and symbols."
          editable={!loading}
        />

        <Button
          label={loading ? 'Finishing up…' : 'Complete sign up'}
          variant="primary"
          loading={loading}
          onPress={handleSetPassword}
          fullWidth
        />
      </AuthShell>
    );
  }

  // ── Step: verify OTP ──────────────────────────────────────────────────────
  return (
    <AuthShell
      title="Check your inbox."
      subtitle={`We sent a 6-digit code to\n${email}`}
      onBack={() => navigation.goBack()}
    >
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <OtpInput value={otp} onChange={setOtp} disabled={loading} />

      <Button
        label={loading ? 'Verifying…' : 'Verify'}
        variant="primary"
        loading={loading}
        disabled={otp.length < 6}
        onPress={handleVerify}
        fullWidth
      />

      <AuthFooterRow
        prompt="Didn't receive the code?"
        linkLabel={countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
        onPress={countdown > 0 || loading ? () => {} : handleResend}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: colors.error.bg,
    borderRadius:    radius.md,
    padding:         space.md,
    borderWidth:     1,
    borderColor:     colors.error.border,
  },
  errorText: {
    ...type.small,
    color: colors.error.fg,
  },
});
