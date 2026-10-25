import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, type, space } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AuthStackProps } from '@/app/navigation/types';
import { dataClient } from '@/lib/data/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordScreen({ navigation }: AuthStackProps<'ForgotPassword'>) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setLoading(true);
    try {
      // Note: requestPasswordResetOtp always resolves (doesn't reveal if email exists)
      await dataClient.requestPasswordResetOtp(data.email.trim().toLowerCase());
      navigation.push('ForgotPasswordOtp', {
        email: data.email.trim().toLowerCase(),
      });
    } catch (e: any) {
      const message = e?.message || 'Failed to send reset code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
          Reset password
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.xxl }]}>
          Enter your email address and we'll send you a code to reset your password.
        </Text>

        {error && (
          <View style={styles.error}>
            <Text style={[type.small, { color: colors.status.danger.fg }]}>{error}</Text>
          </View>
        )}

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState: { error: fieldError } }) => (
            <Input
              label="Email Address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldError?.message}
              containerStyle={{ marginBottom: space.lg }}
            />
          )}
        />

        <Button
          label="Send Reset Code"
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
        />
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
});
