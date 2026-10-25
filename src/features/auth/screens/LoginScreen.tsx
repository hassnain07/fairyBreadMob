import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, type, space } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/app/_providers';
import type { AuthStackProps } from '@/app/navigation/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginScreen({ navigation }: AuthStackProps<'Login'>) {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);
    try {
      await signIn(data.email.trim().toLowerCase(), data.password);
    } catch (e: any) {
      const message = e?.message || 'Sign in failed. Please try again.';
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
          Sign in
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.xxl }]}>
          Enter your email and password to access your account.
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

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState: { error: fieldError } }) => (
            <Input
              label="Password"
              variant="password"
              placeholder="••••••••"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldError?.message}
              containerStyle={{ marginBottom: space.lg }}
            />
          )}
        />

        <Button
          label="Sign In"
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={{ marginBottom: space.lg }}
        />

        <View style={styles.footer}>
          <Text style={[type.small, { color: colors.muted }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.push('Signup', {})}>
            <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>
              Create one
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { marginTop: space.md }]}>
          <TouchableOpacity onPress={() => navigation.push('ForgotPassword')}>
            <Text style={[type.small, { color: colors.pink }]}>
              Forgot your password?
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
