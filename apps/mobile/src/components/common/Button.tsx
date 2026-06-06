import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../../constants/colors';

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  title,
  loading = false,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: { paddingHorizontal: 16, paddingVertical: 8 },
  size_md: { paddingHorizontal: 20, paddingVertical: 13 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 16 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '600' },
  label_primary: { color: colors.white },
  label_outline: { color: colors.primary },
  label_ghost: { color: colors.primary },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
