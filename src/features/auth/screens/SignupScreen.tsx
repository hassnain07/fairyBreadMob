import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, type, space, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthShell } from '../components/AuthShell';
import { AuthFooterRow } from '../components/AuthFooterRow';
import type { AuthStackProps } from '@/app/navigation/types';
import { dataClient } from '@/lib/data/client';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName:  z.string().min(1, 'Last name is required.'),
  email:     z.string().email('Please enter a valid email address.'),
  phone:     z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function SignupScreen({ navigation }: AuthStackProps<'Signup'>) {
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      await dataClient.requestSignupOtp({
        email:     data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName:  data.lastName.trim(),
        phone:     data.phone?.trim(),
      });
      navigation.push('SignupOtp', {
        email:     data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName:  data.lastName.trim(),
        phone:     data.phone?.trim(),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account."
      subtitle="Join the Fairybread & Fractions community."
      onBack={() => navigation.goBack()}
    >
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="firstName"
        render={({ field, fieldState: { error: fe } }) => (
          <Input label="First name" placeholder="Jane" value={field.value} onChangeText={field.onChange} error={fe?.message} />
        )}
      />
      <Controller
        control={control}
        name="lastName"
        render={({ field, fieldState: { error: fe } }) => (
          <Input label="Last name" placeholder="Smith" value={field.value} onChangeText={field.onChange} error={fe?.message} />
        )}
      />
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
        name="phone"
        render={({ field }) => (
          <Input
            label="Phone (optional)"
            placeholder="+61 4xx xxx xxx"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />

      <Button
        label={loading ? 'Sending code…' : 'Continue'}
        variant="primary"
        loading={loading}
        onPress={handleSubmit(onSubmit)}
        fullWidth
      />

      <AuthFooterRow
        prompt="Already have an account?"
        linkLabel="Sign in"
        onPress={() => navigation.push('Login')}
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
