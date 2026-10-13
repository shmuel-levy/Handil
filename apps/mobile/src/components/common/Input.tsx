import React, { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

const Input = forwardRef<TextInput, Props>(({ label, error, style, onFocus, onBlur, ...rest }, ref) => {
  // Focus used to have no visual state at all, so on a long form it was hard
  // to tell which field the keyboard was typing into.
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={colors.textDisabled}
        textAlign="right"
        accessibilityLabel={label ?? rest.placeholder}
        accessibilityState={{ invalid: !!error } as any}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...rest}
      />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
});

Input.displayName = 'Input';
export default Input;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  // Thick bottom rule like a level line
  inputFocused: { borderColor: colors.asphalt, borderBottomWidth: 3, borderBottomColor: colors.primary },
  inputError: { borderColor: colors.error },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    textAlign: 'right',
  },
});
