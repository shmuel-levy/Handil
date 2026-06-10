import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { getCategoryBySlug } from '../../constants/categories';
import { WorkerProfile } from '../../types';
import StarRating from './StarRating';

interface Props {
  worker: WorkerProfile;
  onPress: () => void;
  style?: ViewStyle;
}

const BADGE_LABEL: Record<string, string> = {
  phone: 'טלפון',
  id: 'תז',
  bank: 'בנק',
};

export default function WorkerCard({ worker, onPress, style }: Props) {
  const primaryCategory = worker.categories[0];
  const category = primaryCategory ? getCategoryBySlug(primaryCategory) : null;
  const badges = worker.verificationBadges ?? [];

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
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
            <Ionicons name={category.icon as any} size={11} color={colors.primary} />
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
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{worker.hourlyRate}₪/שעה</Text>
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
                <Ionicons name="shield-checkmark-outline" size={10} color={colors.success} />
                <Text style={styles.badgeText}>אומת {BADGE_LABEL[b]}</Text>
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  left: { position: 'relative', marginEnd: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.white },
  availableDot: {
    position: 'absolute', bottom: 1, end: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2, borderColor: colors.surface,
  },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'right' },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: colors.success },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    alignSelf: 'flex-start', marginBottom: 5,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textMuted },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, borderColor: colors.success + '40',
  },
  badgeText: { fontSize: 10, color: colors.success, fontWeight: '600' },
});
