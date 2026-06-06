import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../../constants/colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

const Input = forwardRef<TextInput, Props>(({ label, error, style, ...rest }, ref) => {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textDisabled}
        textAlign="right"
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

Input.displayName = 'Input';
export default Input;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.error },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    textAlign: 'right',
  },
});
