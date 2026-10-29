import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, type, space, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/app/_providers';
import { AuthShell } from '../components/AuthShell';
import { AuthFooterRow } from '../components/AuthFooterRow';
import type { AuthStackProps } from '@/app/navigation/types';

const schema = z.object({
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormData = z.infer<typeof schema>;

export function LoginScreen({ navigation }: AuthStackProps<'Login'>) {
  const { signIn } = useAuth();
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      await signIn(data.email.trim().toLowerCase(), data.password);
    } catch (e: any) {
      setError(e?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to your Fairybread account."
      onBack={() => navigation.goBack()}
    >
      {/* Error banner */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fields */}
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

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState: { error: fe } }) => (
          <Input
            label="Password"
            variant="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={field.value}
            onChangeText={field.onChange}
            error={fe?.message}
          />
        )}
      />

      {/* Forgot password */}
      <TouchableOpacity
        onPress={() => navigation.push('ForgotPassword')}
        style={styles.forgotWrap}
        hitSlop={8}
      >
        <Text style={styles.forgotText}>Forgot your password?</Text>
      </TouchableOpacity>

      {/* Submit */}
      <Button
        label={loading ? 'Signing in…' : 'Sign In'}
        variant="primary"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
        fullWidth
      />

      {/* Footer link */}
      <AuthFooterRow
        prompt="Don't have an account?"
        linkLabel="Create one"
        onPress={() => navigation.push('Signup', {})}
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
  forgotWrap: {
    alignSelf:  'flex-end',
    marginTop:  -space.xs,
    marginBottom: space.xs,
  },
  forgotText: {
    ...type.small,
    color:      colors.pink,
    fontWeight: '600',
  },
});
