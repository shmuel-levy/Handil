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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <WorkerHeader
            worker={worker}
            onBook={() =>
              navigation.navigate('BookingRequest', {
                workerId: worker._id,
                workerUserId: worker.user._id,
                workerName: worker.user.name,
                category: worker.categories[0],
              })
            }
            canBook={canBook}
            reviews={reviews}
          />
        }
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListEmptyComponent={
          <View style={styles.noReviews}>
            <Ionicons name="star-outline" size={28} color={colors.textDisabled} />
            <Text style={styles.noReviewsText}>אין ביקורות עדיין</Text>
          </View>
        }
      />

      {canBook && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() =>
              navigation.navigate('BookingRequest', {
                workerId: worker._id,
                workerUserId: worker.user._id,
                workerName: worker.user.name,
                category: worker.categories[0],
              })
            }
          >
            <Ionicons name="calendar-outline" size={18} color={colors.white} />
            <Text style={styles.bookBtnText}>הזמינו את {worker.user.name}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function WorkerHeader({
  worker,
  onBook,
  canBook,
  reviews,
}: {
  worker: WorkerProfile;
  onBook: () => void;
  canBook: boolean;
  reviews: Review[];
}) {
  return (
    <>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{worker.user.name.charAt(0).toUpperCase()}</Text>
          </View>
          {worker.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color={colors.white} />
            </View>
          )}
        </View>
        <Text style={styles.workerName}>{worker.user.name}</Text>
        <StarRating rating={worker.rating} reviewCount={worker.reviewCount} size={14} />

        {/* Badges */}
        <View style={styles.badgeRow}>
          {worker.isAvailable && (
            <View style={[styles.badge, styles.badgeGreen]}>
              <View style={styles.availableDot} />
              <Text style={[styles.badgeText, { color: colors.success }]}>זמין עכשיו</Text>
            </View>
          )}
          {worker.isVerified && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Ionicons name="shield-checkmark-outline" size={11} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>מאומת</Text>
            </View>
          )}
          {worker.offersTeaching && (
            <View style={[styles.badge, styles.badgePurple]}>
              <Ionicons name="school-outline" size={11} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: '#7C3AED' }]}>מדריך</Text>
            </View>
          )}
        </View>
      </View>

      {/* Compact stats row */}
      <View style={styles.statsRow}>
        <StatPill icon="location-outline" value={worker.city || 'לא צוין'} label="עיר" />
        <View style={styles.statDivider} />
        <StatPill
          icon="briefcase-outline"
          value={worker.yearsExperience > 0 ? `${worker.yearsExperience} שנים` : '—'}
          label="ניסיון"
        />
        <View style={styles.statDivider} />
        <StatPill
          icon="cash-outline"
          value={worker.hourlyRate ? `₪${worker.hourlyRate}` : 'לפי הסכמה'}
          label="לשעה"
        />
        <View style={styles.statDivider} />
        <StatPill icon="star-outline" value={String(worker.reviewCount)} label="ביקורות" />
      </View>

      {/* Phone */}
      {worker.user.phone ? (
        <TouchableOpacity
          style={styles.phoneBtn}
          onPress={() => Linking.openURL(`tel:${worker.user.phone}`)}
        >
          <Ionicons name="call-outline" size={16} color={colors.success} />
          <Text style={styles.phoneBtnText}>{worker.user.phone}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Bio */}
      {worker.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אודות</Text>
          <Text style={styles.bio}>{worker.bio}</Text>
        </View>
      ) : null}

      {/* Teaching service */}
      {worker.offersTeaching && (
        <View style={styles.teachingBanner}>
          <View style={styles.teachingIconWrap}>
            <Ionicons name="school" size={20} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teachingTitle}>מציע שירות הדרכה</Text>
            <Text style={styles.teachingSub}>
              {worker.teachingRate
                ? `+₪${worker.teachingRate}/שעה — ילמד אותך לתקן לבד בפעם הבאה`
                : 'ילמד אותך לתקן לבד בפעם הבאה'}
            </Text>
          </View>
        </View>
      )}

      {/* Categories */}
      {worker.categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תחומי עיסוק</Text>
          <View style={styles.catRow}>
            {worker.categories.map((slug) => {
              const cat = getCategoryBySlug(slug);
              return (
                <View key={slug} style={styles.catChip}>
                  <Ionicons name={(cat?.icon ?? 'ellipse-outline') as any} size={13} color={colors.primary} />
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
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon as any} size={15} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{review.resident.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName}>{review.resident.name}</Text>
          <StarRating rating={review.rating} showCount={false} size={11} />
        </View>
        <Text style={styles.reviewDate}>
          {new Date(review.createdAt).toLocaleDateString('he-IL')}
        </Text>
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center' },
  listContent: { paddingBottom: 100 },

  // Hero
  hero: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 0,
  },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.white },
  verifiedBadge: {
    position: 'absolute',
    bottom: 1,
    end: 1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  workerName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 5 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  badgeGreen: { backgroundColor: colors.successLight },
  badgeBlue: { backgroundColor: colors.primaryLight },
  badgePurple: { backgroundColor: '#F5F3FF' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },

  // Stats row (compact, no big cards)
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  statPill: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  // Phone
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    backgroundColor: colors.successLight,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.success,
  },
  phoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.success },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  reviewsHeader: { paddingHorizontal: 20, marginBottom: 8 },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 24 },

  // Category chips — compact
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // Teaching service banner
  teachingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  teachingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  teachingTitle: { fontSize: 13, fontWeight: '700', color: '#5B21B6', textAlign: 'right', marginBottom: 2 },
  teachingSub: { fontSize: 12, color: '#6D28D9', textAlign: 'right', lineHeight: 18 },

  // Reviews
  reviewCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: colors.white },
  reviewerName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  reviewComment: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 21 },
  noReviews: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  noReviewsText: { fontSize: 13, color: colors.textMuted },

  // Footer
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
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
