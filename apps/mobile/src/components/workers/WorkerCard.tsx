import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { getCategoryBySlug } from '../../constants/categories';
import { WorkerProfile } from '../../types';
import StarRating from './StarRating';

interface Props {
  worker: WorkerProfile;
  onPress: () => void;
}

export default function WorkerCard({ worker, onPress }: Props) {
  const primaryCategory = worker.categories[0];
  const category = primaryCategory ? getCategoryBySlug(primaryCategory) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {worker.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {worker.isAvailable && <View style={styles.availableDot} />}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{worker.user.name}</Text>
          {worker.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.verifiedIcon} />
          )}
        </View>

        {category && (
          <Text style={styles.category}>{category.name_he}</Text>
        )}

        <StarRating rating={worker.rating} reviewCount={worker.reviewCount} size={13} />

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{worker.city}</Text>
          </View>
          {worker.hourlyRate && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{worker.hourlyRate}₪/שעה</Text>
            </View>
          )}
          {worker.yearsExperience > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{worker.yearsExperience} שנ׳</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-back" size={20} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  left: { position: 'relative', marginEnd: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  availableDot: {
    position: 'absolute',
    bottom: 1,
    end: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  verifiedIcon: { marginStart: 4 },
  category: { fontSize: 13, color: colors.textMuted, textAlign: 'right', marginBottom: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: colors.textMuted },
});
