import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ScrollView,
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
import { PortfolioItem, Review, WorkerProfile, WorkerStats } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'WorkerDetail'>;

const BADGE_META: Record<string, { label: string; icon: string }> = {
  phone: { label: 'טלפון אומת', icon: 'call-outline' },
  id:    { label: 'תז אומת',   icon: 'card-outline' },
  bank:  { label: 'בנק אומת',  icon: 'card-outline' },
};

export default function WorkerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const user = useAuthStore((s) => s.user);

  const [worker, setWorker]   = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats]     = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getWorker(params.workerId)
      .then(({ worker: w, reviews: r, stats: s }) => {
        setWorker(w);
        setReviews(r);
        setStats(s ?? null);
      })
      .catch(() => setError('לא ניתן לטעון את הפרופיל'))
      .finally(() => setLoading(false));
  }, [params.workerId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
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
  const badges = worker.verificationBadges ?? [];

  function goBook() {
    navigation.navigate('BookingRequest', {
      workerId: worker!._id,
      workerUserId: worker!.user._id,
      workerName: worker!.user.name,
      category: worker!.categories[0],
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: canBook ? 90 : 20 }}>
        {/* ── Hero ── */}
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

          <View style={styles.heroChips}>
            {worker.isAvailable && (
              <View style={[styles.chip, styles.chipGreen]}>
                <View style={styles.greenDot} />
                <Text style={[styles.chipText, { color: colors.success }]}>זמין עכשיו</Text>
              </View>
            )}
            {worker.isVerified && (
              <View style={[styles.chip, styles.chipBlue]}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]}>בעל מקצוע מאומת</Text>
              </View>
            )}
            {worker.offersTeaching && (
              <View style={[styles.chip, styles.chipPurple]}>
                <Ionicons name="school-outline" size={11} color="#7C3AED" />
                <Text style={[styles.chipText, { color: '#7C3AED' }]}>מדריך</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Basic stats row ── */}
        <View style={styles.statsRow}>
          <StatBox icon="location-outline" value={worker.city || '—'} label="עיר" />
          <View style={styles.divV} />
          <StatBox
            icon="briefcase-outline"
            value={worker.yearsExperience > 0 ? `${worker.yearsExperience} שנ׳` : '—'}
            label="ניסיון"
          />
          <View style={styles.divV} />
          <StatBox
            icon="cash-outline"
            value={worker.hourlyRate ? `₪${worker.hourlyRate}` : 'לפי הסכמה'}
            label="לשעה"
          />
          <View style={styles.divV} />
          <StatBox icon="star-outline" value={String(worker.reviewCount)} label="ביקורות" />
        </View>

        {/* ── Reliability stats ── */}
        {stats && (stats.totalJobsDone > 0 || stats.completionRate !== null || stats.quoteAcceptRate !== null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>דירוג אמינות</Text>
            <View style={styles.reliabilityGrid}>
              {stats.totalJobsDone > 0 && (
                <ReliabilityCard
                  icon="checkmark-done-outline"
                  value={String(stats.totalJobsDone)}
                  label="עבודות שבוצעו"
                  color={colors.success}
                />
              )}
              {stats.completionRate !== null && (
                <ReliabilityCard
                  icon="trophy-outline"
                  value={`${stats.completionRate}%`}
                  label="אחוז השלמות"
                  color={colors.success}
                />
              )}
              {stats.quoteAcceptRate !== null && (
                <ReliabilityCard
                  icon="trending-up-outline"
                  value={`${stats.quoteAcceptRate}%`}
                  label="הצעות שאושרו"
                  color={colors.primary}
                />
              )}
              {stats.avgResponseHours !== null && (
                <ReliabilityCard
                  icon="timer-outline"
                  value={
                    stats.avgResponseHours < 1
                      ? 'מתחת לשעה'
                      : stats.avgResponseHours < 24
                      ? `${stats.avgResponseHours} שע׳`
                      : `${Math.round(stats.avgResponseHours / 24)} ימים`
                  }
                  label="זמן תגובה ממוצע"
                  color={colors.warning}
                />
              )}
            </View>
          </View>
        )}

        {/* ── Phone ── */}
        {worker.user.phone ? (
          <TouchableOpacity
            style={styles.phoneBtn}
            onPress={() => Linking.openURL(`tel:${worker.user.phone}`)}
          >
            <Ionicons name="call-outline" size={16} color={colors.success} />
            <Text style={styles.phoneBtnText}>{worker.user.phone}</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── Bio ── */}
        {worker.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>אודות</Text>
            <Text style={styles.bio}>{worker.bio}</Text>
          </View>
        ) : null}

        {/* ── Teaching ── */}
        {worker.offersTeaching && (
          <View style={styles.teachingBanner}>
            <View style={styles.teachingIconWrap}>
              <Ionicons name="school" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teachingTitle}>מציע שירות הדרכה</Text>
              <Text style={styles.teachingSub}>
                {worker.teachingRate
                  ? `+₪${worker.teachingRate}/שעה — ילמד אותך לתקן לבד`
                  : 'ילמד אותך לתקן לבד בפעם הבאה'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Categories ── */}
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

        {/* ── Verification badges ── */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>אימותים</Text>
            <View style={styles.verifyRow}>
              {badges.map((b) => (
                <View key={b} style={styles.verifyBadge}>
                  <Ionicons name={BADGE_META[b]?.icon as any ?? 'shield-checkmark-outline'} size={14} color={colors.success} />
                  <Text style={styles.verifyBadgeText}>{BADGE_META[b]?.label ?? b}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Portfolio ── */}
        {worker.portfolio && worker.portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תיק עבודות ({worker.portfolio.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
                {worker.portfolio.map((item) => (
                  <PortfolioCard key={item._id} item={item} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ביקורות ({reviews.length})</Text>
            {reviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </View>
        )}
        {reviews.length === 0 && (
          <View style={styles.noReviews}>
            <Ionicons name="star-outline" size={28} color={colors.textDisabled} />
            <Text style={styles.noReviewsText}>אין ביקורות עדיין</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Book footer ── */}
      {canBook && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.bookBtn} onPress={goBook}>
            <Ionicons name="calendar-outline" size={18} color={colors.white} />
            <Text style={styles.bookBtnText}>הזמינו את {worker.user.name}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon as any} size={14} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReliabilityCard({
  icon, value, label, color,
}: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={[styles.relCard, { borderTopColor: color }]}>
      <View style={[styles.relIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.relValue, { color }]}>{value}</Text>
      <Text style={styles.relLabel}>{label}</Text>
    </View>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <View style={styles.portfolioCard}>
      <View style={styles.portfolioImages}>
        {item.beforeImage ? (
          <View style={styles.portfolioImgWrap}>
            <Image source={{ uri: item.beforeImage }} style={styles.portfolioImg} resizeMode="cover" />
            <View style={styles.portfolioImgLabel}><Text style={styles.portfolioImgLabelText}>לפני</Text></View>
          </View>
        ) : (
          <View style={[styles.portfolioImgWrap, styles.portfolioImgPlaceholder]}>
            <Ionicons name="image-outline" size={24} color={colors.textDisabled} />
          </View>
        )}
        {item.afterImage ? (
          <View style={styles.portfolioImgWrap}>
            <Image source={{ uri: item.afterImage }} style={styles.portfolioImg} resizeMode="cover" />
            <View style={[styles.portfolioImgLabel, { backgroundColor: colors.success }]}>
              <Text style={styles.portfolioImgLabelText}>אחרי</Text>
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.portfolioInfo}>
        <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.portfolioDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
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
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center' },

  // Hero
  hero: {
    backgroundColor: colors.surface, alignItems: 'center',
    paddingVertical: 24, paddingHorizontal: 20,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.white },
  verifiedBadge: {
    position: 'absolute', bottom: 2, end: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  workerName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  chipGreen:  { backgroundColor: colors.successLight },
  chipBlue:   { backgroundColor: colors.primaryLight },
  chipPurple: { backgroundColor: '#F5F3FF' },
  chipText:   { fontSize: 11, fontWeight: '700' },
  greenDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },

  // Basic stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 12,
    borderBottomWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  divV: { width: 1, height: 32, backgroundColor: colors.border },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },

  // Reliability
  reliabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  relCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderTopWidth: 3, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  relIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  relValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  relLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  // Phone
  phoneBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 7,
    backgroundColor: colors.successLight, paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, marginHorizontal: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.success,
  },
  phoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.success },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 24 },

  // Categories
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // Teaching
  teachingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  teachingIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  teachingTitle: { fontSize: 13, fontWeight: '700', color: '#5B21B6', textAlign: 'right', marginBottom: 2 },
  teachingSub: { fontSize: 12, color: '#6D28D9', textAlign: 'right', lineHeight: 18 },

  // Verification badges
  verifyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  verifyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.success + '40',
  },
  verifyBadgeText: { fontSize: 12, color: colors.success, fontWeight: '600' },

  // Portfolio
  portfolioCard: {
    width: 200, backgroundColor: colors.surface,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  portfolioImages: { flexDirection: 'row' },
  portfolioImgWrap: { flex: 1, height: 110, position: 'relative' },
  portfolioImgPlaceholder: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  portfolioImg: { width: '100%', height: '100%' },
  portfolioImgLabel: {
    position: 'absolute', bottom: 4, start: 4,
    backgroundColor: colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  portfolioImgLabelText: { fontSize: 9, fontWeight: '700', color: colors.white },
  portfolioInfo: { padding: 10 },
  portfolioTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 3 },
  portfolioDesc: { fontSize: 11, color: colors.textMuted, textAlign: 'right', lineHeight: 16 },

  // Reviews
  reviewCard: {
    backgroundColor: colors.surface, marginBottom: 10,
    borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: colors.white },
  reviewerName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  reviewComment: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 21 },
  noReviews: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  noReviewsText: { fontSize: 13, color: colors.textMuted },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderColor: colors.border,
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  bookBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
