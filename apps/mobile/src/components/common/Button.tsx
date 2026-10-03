import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../../constants/colors';
import { MIN_TOUCH_TARGET, plateEdge, radius } from '../../constants/theme';

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
      // Screen readers announce the label and the disabled/busy state.
      // `rest` comes last so a caller can still override any of these.
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.asphalt} size="small" />
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
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: MIN_TOUCH_TARGET,
  },
  // Solid bottom edge instead of a soft shadow: a pressed-steel control
  primary: {
    backgroundColor: colors.primary,
    ...plateEdge(colors.primaryDark),
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.asphalt,
    ...plateEdge(colors.asphalt, 3),
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: { paddingHorizontal: 16, paddingVertical: 8 },
  size_md: { paddingHorizontal: 20, paddingVertical: 12 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 15 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '800', letterSpacing: 0.2 },
  label_primary: { color: colors.white },
  label_outline: { color: colors.asphalt },
  label_ghost: { color: colors.primary },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
