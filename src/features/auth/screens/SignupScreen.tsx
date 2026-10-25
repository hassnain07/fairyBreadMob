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

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupScreen({ navigation }: AuthStackProps<'Signup'>) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setLoading(true);
    try {
      await dataClient.requestSignupOtp({
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim(),
      });
      navigation.push('SignupOtp', {
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim(),
      });
    } catch (e: any) {
      const message = e?.message || 'Failed to create account. Please try again.';
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
          Create account
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.xxl }]}>
          Join the Fairybread & Fractions community.
        </Text>

        {error && (
          <View style={styles.error}>
            <Text style={[type.small, { color: colors.status.danger.fg }]}>{error}</Text>
          </View>
        )}

        <Controller
          control={control}
          name="firstName"
          render={({ field, fieldState: { error: fieldError } }) => (
            <Input
              label="First Name"
              placeholder="Jane"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldError?.message}
              containerStyle={{ marginBottom: space.lg }}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field, fieldState: { error: fieldError } }) => (
            <Input
              label="Last Name"
              placeholder="Doe"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldError?.message}
              containerStyle={{ marginBottom: space.lg }}
            />
          )}
        />

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

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              label="Phone (optional)"
              placeholder="+61 2 1234 5678"
              keyboardType="phone-pad"
              value={field.value}
              onChangeText={field.onChange}
              containerStyle={{ marginBottom: space.lg }}
            />
          )}
        />

        <Button
          label="Continue"
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginBottom: space.lg }}
        />

        <View style={styles.footer}>
          <Text style={[type.small, { color: colors.muted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.push('Login')}>
            <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>
              Sign in
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
});
