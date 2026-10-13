import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { fontSize, radius, spacing } from '../../constants/theme';

/**
 * Shown when a fetch fails.
 *
 * Several screens used to swallow errors in an empty `catch {}` and render the
 * "nothing here yet" empty state instead — so a dropped connection looked
 * exactly like having no data, and there was nothing to retry.
 */
export default function ErrorState({
  message = 'משהו השתבש. נסו שוב',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.error} />
      </View>
      <Text style={styles.title}>אופס</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={styles.retry}
          onPress={onRetry}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="נסה שוב"
        >
          <Ionicons name="refresh" size={16} color={colors.white} />
          <Text style={styles.retryText}>נסו שוב</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.title, fontWeight: '700',
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.body, color: colors.textMuted,
    textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl,
  },
  retry: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: fontSize.body },
});
