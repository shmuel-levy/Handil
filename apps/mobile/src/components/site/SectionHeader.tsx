import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { fontSize, radius, spacing } from '../../constants/theme';

/**
 * Section title with a short block of safety yellow in front of it — the
 * strip of marking tape a foreman sticks on a shelf to label it.
 */
export default function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleWrap}>
        <View style={styles.marker} />
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marker: {
    width: 6,
    height: 20,
    borderRadius: 1,
    backgroundColor: colors.hazard,
    borderWidth: 1,
    borderColor: colors.hazardDark,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  action: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
  },
  actionText: { fontSize: fontSize.small, fontWeight: '800', color: colors.textPrimary },
});
