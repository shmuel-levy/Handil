import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import StarRating from '../../components/workers/StarRating';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { HomeStackParamList } from '../../navigation/types';
import { getWorker } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { Review, WorkerProfile } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'WorkerDetail'>;

export default function WorkerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const user = useAuthStore((s) => s.user);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getWorker(params.workerId)
      .then(({ worker: w, reviews: r }) => {
        setWorker(w);
        setReviews(r);
      })
      .catch(() => setError('לא ניתן לטעון את הפרופיל'))
      .finally(() => setLoading(false));
  }, [params.workerId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error || !worker) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.errorText}>{error || 'שגיאה בטעינה'}</Text>
      </View>
    );
  }

  const isOwnProfile = user?.id === worker.user._id;
  const canBook = user?.role === 'resident' && !isOwnProfile;
  const hasPhone = Boolean(worker.user.phone);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{worker.user.name.charAt(0).toUpperCase()}</Text>
                </View>
                {worker.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color={colors.white} />
                  </View>
                )}
              </View>
              <Text style={styles.workerName}>{worker.user.name}</Text>
              <StarRating rating={worker.rating} reviewCount={worker.reviewCount} size={16} />

              <View style={styles.badgeRow}>
                {worker.isAvailable && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <View style={styles.availableDot} />
                    <Text style={[styles.badgeText, { color: colors.success }]}>זמין עכשיו</Text>
                  </View>
                )}
                {worker.isVerified && (
                  <View style={[styles.badge, styles.badgeBlue]}>
                    <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>מאומת</Text>
                  </View>
                )}
              </View>

              {/* Quick action buttons */}
              {hasPhone && (
                <TouchableOpacity
                  style={styles.phoneBtn}
                  onPress={() => Linking.openURL(`tel:${worker.user.phone}`)}
                >
                  <Ionicons name="call-outline" size={18} color={colors.success} />
                  <Text style={styles.phoneBtnText}>התקשר: {worker.user.phone}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info cards */}
            <View style={styles.infoGrid}>
              <InfoCard icon="location-outline" label="עיר" value={worker.city} />
              <InfoCard
                icon="briefcase-outline"
                label="ניסיון"
                value={worker.yearsExperience > 0 ? `${worker.yearsExperience} שנים` : 'לא צוין'}
              />
              <InfoCard
                icon="cash-outline"
                label="תעריף"
                value={worker.hourlyRate ? `${worker.hourlyRate}₪/שעה` : 'לפי הסכמה'}
              />
              <InfoCard icon="star-outline" label="דירוגים" value={String(worker.reviewCount)} />
            </View>

            {/* Bio */}
            {worker.bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>אודות</Text>
                <Text style={styles.bio}>{worker.bio}</Text>
              </View>
            ) : null}

            {/* Categories */}
            {worker.categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תחומי עיסוק</Text>
                <View style={styles.catRow}>
                  {worker.categories.map((slug) => {
                    const cat = getCategoryBySlug(slug);
                    return (
                      <View key={slug} style={styles.catChip}>
                        <Ionicons name={(cat?.icon ?? 'ellipse-outline') as any} size={14} color={colors.primary} />
                        <Text style={styles.catChipText}>{cat?.name_he ?? slug}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {reviews.length > 0 && (
              <Text style={[styles.sectionTitle, styles.reviewsHeader]}>
                ביקורות ({reviews.length})
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarText}>{item.resident.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewerName}>{item.resident.name}</Text>
                <StarRating rating={item.rating} showCount={false} size={12} />
              </View>
              <Text style={styles.reviewDate}>
                {new Date(item.createdAt).toLocaleDateString('he-IL')}
              </Text>
            </View>
            {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={32} color={colors.textDisabled} />
              <Text style={styles.noReviewsText}>אין ביקורות עדיין</Text>
            </View>
          ) : null
        }
      />

      {/* Book button */}
      {canBook && (
        <View style={styles.footer}>
          <Button
            title={`הזמינו את ${worker.user.name}`}
            size="lg"
            onPress={() =>
              navigation.navigate('BookingRequest', {
                workerId: worker._id,
                workerUserId: worker.user._id,
                workerName: worker.user.name,
                category: worker.categories[0],
              })
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center' },
  listContent: { paddingBottom: 100 },
  hero: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    end: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  workerName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeGreen: { backgroundColor: colors.successLight },
  badgeBlue: { backgroundColor: colors.primaryLight },
  badgeText: { fontSize: 12, fontWeight: '700' },
  availableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  phoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.success },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  reviewsHeader: { paddingHorizontal: 20, marginBottom: 8 },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 22 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  reviewCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  reviewerName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  reviewComment: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 20 },
  noReviews: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  noReviewsText: { fontSize: 14, color: colors.textMuted },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
