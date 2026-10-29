/**
 * OtpInput — 6-box OTP entry with individual digit squares.
 * Uses a single hidden TextInput behind visible boxes so the native
 * keyboard and paste behaviour work perfectly.
 */

import React, { useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import type { ElementRef } from 'react';
import { colors, radius, space } from '@/theme';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={styles.wrapper}>
        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          style={styles.hidden}
          editable={!disabled}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          importantForAccessibility="no"
          accessible={false}
        />

        {/* Visible boxes */}
        {digits.map((d, i) => {
          const isFilled  = i < value.length;
          const isCurrent = i === value.length && i < length;
          return (
            <View
              key={i}
              style={[
                styles.box,
                isFilled  && styles.boxFilled,
                isCurrent && styles.boxCurrent,
              ]}
            >
              <Text style={[styles.digit, isFilled && styles.digitFilled]}>
                {d || (isCurrent ? '|' : '')}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableWithoutFeedback>
  );
}

const BOX = 48;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            space.sm,
  },
  hidden: {
    position:  'absolute',
    opacity:   0,
    height:    1,
    width:     1,
    // keep it near the boxes so the keyboard context stays correct
    top:       BOX / 2,
    left:      0,
  },
  box: {
    flex:            1,
    height:          BOX,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.line,
    alignItems:      'center',
    justifyContent:  'center',
  },
  boxFilled: {
    backgroundColor: colors.pinkSoft,
    borderColor:     colors.pink,
  },
  boxCurrent: {
    borderColor:  colors.pink,
    borderWidth:  2,
    ...Platform.select({
      ios: {
        shadowColor:   colors.pink,
        shadowOpacity: 0.2,
        shadowRadius:  6,
        shadowOffset:  { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  digit: {
    fontFamily: 'DMSans-Bold',
    fontSize:   20,
    color:      colors.muted,
    lineHeight: 24,
  },
  digitFilled: {
    color: colors.pink,
  },
});
