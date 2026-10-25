import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, type, space, shadow } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'default' | 'password';
  helperText?: string;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function Input({
  label,
  error,
  variant = 'default',
  helperText,
  containerStyle,
  style,
  testID,
  onChangeText,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = variant === 'password';
  const hasError = !!error;
  const isSecure = isPassword && !showPassword;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[type.caption, { color: colors.mutedSoft, marginBottom: space.xs }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
        ]}
      >
        <TextInput
          testID={testID}
          style={[
            styles.input,
            type.body,
            { color: colors.ink, paddingRight: isPassword ? 44 : 16 },
          ]}
          placeholderTextColor={colors.mutedSoft}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          editable={props.editable !== false}
          maxFontSizeMultiplier={1.3}
          {...props}
          onChangeText={(text) => {
            onChangeText?.(text);
          }}
        />

        {isPassword && (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.muted} strokeWidth={2} />
            ) : (
              <Eye size={18} color={colors.muted} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </View>

      {error && (
        <Text style={[type.small, { color: '#C0392B', marginTop: space.xs }]}>
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputFocused: {
    borderColor: colors.pink,
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#E85A5A',
  },
  input: {
    flex: 1,
    padding: 0,
  },
  eyeButton: {
    padding: space.sm,
  },
});
