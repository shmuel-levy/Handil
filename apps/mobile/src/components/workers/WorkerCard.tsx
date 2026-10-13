import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { leadingEdge, monoFont, plateEdge, radius } from '../../constants/theme';
import { getCategoryBySlug } from '../../constants/categories';
import { WorkerProfile } from '../../types';
import StarRating from './StarRating';

interface Props {
  worker: WorkerProfile;
  onPress: () => void;
  style?: ViewStyle;
}

// These badges are self-declared by the worker — nothing is checked server
// side — so the wording says "מסר" (provided), not "אומת" (verified).
// Claiming platform verification for an unchecked tap would mislead residents
// deciding who to let into their home.
const BADGE_LABEL: Record<string, string> = {
  phone: 'מסר טלפון',
  id: 'מסר ת״ז',
  bank: 'מסר חשבון',
};

export default function WorkerCard({ worker, onPress, style }: Props) {
  const primaryCategory = worker.categories[0];
  const category = primaryCategory ? getCategoryBySlug(primaryCategory) : null;
  const badges = worker.verificationBadges ?? [];

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        `${worker.user.name}, ${category?.name_he ?? ''}, ` +
        `דירוג ${worker.rating.toFixed(1)} מתוך 5, ${worker.reviewCount} ביקורות, ${worker.city}`
      }
      accessibilityHint="פתיחת פרופיל בעל המקצוע"
    >
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{worker.user.name.charAt(0).toUpperCase()}</Text>
        </View>
        {worker.isAvailable && <View style={styles.availableDot} />}
      </View>

      <View style={styles.body}>
        {/* Name + verified */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{worker.user.name}</Text>
          {worker.isVerified && (
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={styles.verifiedText}>מאומת</Text>
            </View>
          )}
        </View>

        {/* Category */}
        {category && (
          <View style={styles.catBadge}>
            <Ionicons name={category.icon as any} size={11} color={colors.hazardInk} />
            <Text style={styles.catBadgeText}>{category.name_he}</Text>
          </View>
        )}

        <StarRating rating={worker.rating} reviewCount={worker.reviewCount} size={12} />

        {/* Meta row */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={styles.metaText}>{worker.city}</Text>
          </View>
          {worker.hourlyRate ? (
            <View style={styles.rateTag}>
              <Text style={styles.rateText}>₪{worker.hourlyRate}</Text>
              <Text style={styles.rateUnit}>/שעה</Text>
            </View>
          ) : null}
          {worker.yearsExperience > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{worker.yearsExperience} שנ׳</Text>
            </View>
          )}
        </View>

        {/* Verification badges (partial) */}
        {badges.length > 0 && (
          <View style={styles.badgesRow}>
            {badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Ionicons name="person-outline" size={10} color={colors.textMuted} />
                <Text style={styles.badgeText}>{BADGE_LABEL[b]}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Ionicons name="chevron-back" size={18} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    // Orange edge strip on the leading side, like the painted edge of a ladder
    ...leadingEdge(colors.primary, 5),
    ...plateEdge(colors.border, 3),
  },
  left: { position: 'relative', marginEnd: 14 },
  // Square "site ID badge" rather than a round social-app avatar
  avatar: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: colors.asphalt,
    alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderBottomColor: colors.hazard,
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: colors.hazard },
  availableDot: {
    position: 'absolute', top: -3, end: -3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2, borderColor: colors.surface,
  },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1, textAlign: 'right' },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
  },
  verifiedText: { fontSize: 10, fontWeight: '800', color: colors.success },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.hazardLight,
    borderWidth: 1, borderColor: colors.hazard,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm,
    alignSelf: 'flex-start', marginBottom: 5,
  },
  catBadgeText: { fontSize: 11, fontWeight: '800', color: colors.hazardInk },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6, gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textMuted },
  rateTag: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: colors.asphalt,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
  },
  rateText: { fontFamily: monoFont, fontSize: 12, fontWeight: '700', color: colors.hazard },
  rateUnit: { fontSize: 10, color: colors.onAsphaltMuted, marginStart: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  badgeText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});
