import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, type, space, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthShell } from '../components/AuthShell';
import type { AuthStackProps } from '@/app/navigation/types';
import { dataClient } from '@/lib/data/client';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordScreen({ navigation }: AuthStackProps<'ForgotPassword'>) {
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError(null); setLoading(true);
    try {
      await dataClient.requestPasswordResetOtp(data.email.trim().toLowerCase());
      navigation.push('ForgotPasswordOtp', { email: data.email.trim().toLowerCase() });
    } catch (e: any) {
      setError(e?.message || 'Failed to send reset code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      title="Reset password."
      subtitle="Enter your email and we'll send you a 6-digit reset code."
      onBack={() => navigation.goBack()}
    >
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState: { error: fe } }) => (
          <Input
            label="Email address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            error={fe?.message}
          />
        )}
      />

      <Button
        label={loading ? 'Sending…' : 'Send Reset Code'}
        variant="primary"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
        fullWidth
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
