import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { monoFont, radius } from '../../constants/theme';

/** Short, stable, human-readable reference derived from a Mongo id. */
export function workOrderNumber(id: string): string {
  return id.slice(-5).toUpperCase();
}

/**
 * "#A3F21" stamped in monospace, like the number on a printed work order.
 * Gives residents and workers a quick way to refer to the same job.
 */
export default function WorkOrderTag({ id, dark = false }: { id: string; dark?: boolean }) {
  return (
    <View
      style={[styles.tag, dark && styles.tagDark]}
      accessibilityLabel={`הזמנת עבודה מספר ${workOrderNumber(id)}`}
    >
      <Text style={[styles.text, dark && styles.textDark]}>#{workOrderNumber(id)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  tagDark: { backgroundColor: colors.asphalt, borderColor: colors.asphaltLine, borderStyle: 'solid' },
  text: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '700',
    color: colors.steel,
    letterSpacing: 0.5,
  },
  textDark: { color: colors.hazard },
});
