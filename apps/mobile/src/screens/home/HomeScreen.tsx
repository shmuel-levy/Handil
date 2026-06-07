import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkerCard from '../../components/workers/WorkerCard';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { HomeStackParamList } from '../../navigation/types';
import { getWorkers } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { WorkerProfile } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [topWorkers, setTopWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    getWorkers({ page: 1 })
      .then(({ workers }) => setTopWorkers(workers.slice(0, isDesktop ? 12 : 10)))
      .catch(() => setTopWorkers([]))
      .finally(() => setLoading(false));
  }, [isDesktop]);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const isWorker = user?.role === 'worker';
  const tabNav = navigation.getParent<any>();

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? [] : ['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Desktop hero bar ── */}
        {isDesktop ? (
          <View style={styles.desktopHero}>
            <View>
              <Text style={styles.desktopHeroTitle}>שלום, {firstName} 👋</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={13} color={colors.primary} />
                <Text style={styles.location}>תל אביב</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.desktopSearchBar}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <Text style={styles.searchPlaceholder}>חפשו בעל מקצוע…</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Mobile header ── */
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>שלום, {firstName} 👋</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <Text style={styles.location}>תל אביב</Text>
                </View>
              </View>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>H</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <Text style={styles.searchPlaceholder}>חפשו בעל מקצוע…</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Categories ── */}
        <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
          <Text style={styles.sectionTitle}>קטגוריות</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}>
            <Text style={styles.sectionLink}>הכל</Text>
          </TouchableOpacity>
        </View>

        {isDesktop ? (
          /* Desktop: category pills in a wrapping row */
          <View style={styles.categoriesDesktop}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryPillDesktop}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconDesktop}>
                  <Ionicons name={cat.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={styles.categoryNameDesktop}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Mobile: horizontal scroll */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryPill}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={cat.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={styles.categoryName}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Job Post action card ── */}
        <View style={[styles.actionRow, isDesktop && styles.actionRowDesktop]}>
          {isWorker ? (
            <TouchableOpacity
              style={[styles.jobCard, isDesktop && styles.jobCardDesktop]}
              onPress={() => tabNav?.navigate('PostsTab')}
              activeOpacity={0.85}
            >
              <View style={styles.jobCardIcon}>
                <Ionicons name="newspaper-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobCardTitle}>עבודות פתוחות</Text>
                <Text style={styles.jobCardSub}>לקוחות מחפשים בעלי מקצוע עכשיו</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.jobCard, styles.jobCardResident, isDesktop && styles.jobCardDesktop]}
              onPress={() => tabNav?.navigate('PostsTab')}
              activeOpacity={0.85}
            >
              <View style={[styles.jobCardIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="create-outline" size={22} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.jobCardTitle, { color: '#92400E' }]}>פרסם עבודה</Text>
                <Text style={styles.jobCardSub}>תאר מה אתה צריך ובעלי מקצוע יפנו אליך</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color="#92400E" />
            </TouchableOpacity>
          )}

          {/* Desktop: also show the banner inline */}
          {isDesktop && (
            <TouchableOpacity
              style={[styles.banner, styles.bannerDesktop]}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
            >
              <Text style={styles.bannerTitle}>מצאו את הטוב ביותר</Text>
              <Text style={styles.bannerSub}>בעלי מקצוע מאומתים, דירוגים אמיתיים</Text>
              <View style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>לחיפוש</Text>
                <Ionicons name="arrow-back" size={13} color={colors.white} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Mobile-only banner ── */}
        {!isDesktop && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>מצאו את הטוב ביותר</Text>
            <Text style={styles.bannerSub}>בעלי מקצוע מאומתים, דירוגים אמיתיים</Text>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
            >
              <Text style={styles.bannerBtnText}>לחיפוש</Text>
              <Ionicons name="arrow-back" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Top Workers ── */}
        <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
          <Text style={styles.sectionTitle}>בעלי מקצוע מובילים</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : topWorkers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyText}>עדיין אין בעלי מקצוע רשומים</Text>
          </View>
        ) : (
          <View style={[
            isDesktop ? styles.workerGrid : styles.workerList,
          ]}>
            {topWorkers.map((w) => (
              <WorkerCard
                key={w._id}
                worker={w}
                style={isDesktop ? styles.workerGridCard : undefined}
                onPress={() => navigation.navigate('WorkerDetail', { workerId: w._id, workerName: w.user.name })}
              />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },

  // ── Mobile header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, justifyContent: 'flex-end' },
  location: { fontSize: 13, color: colors.textMuted },
  logoMark: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoMarkText: { fontSize: 20, fontWeight: '900', color: colors.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 24,
  },

  // ── Desktop hero
  desktopHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  desktopHeroTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  desktopSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
    minWidth: 320,
  },
  searchPlaceholder: { fontSize: 14, color: colors.textDisabled, flex: 1 },

  // ── Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionHeaderDesktop: { paddingHorizontal: 32, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // ── Mobile categories
  categoriesRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 24 },
  categoryPill: { alignItems: 'center', width: 72 },
  categoryIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  categoryName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },

  // ── Desktop categories grid
  categoriesDesktop: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 32, marginBottom: 24,
  },
  categoryPillDesktop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 140,
  },
  categoryIconDesktop: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  categoryNameDesktop: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  // ── Job card + banner row
  actionRow: { paddingHorizontal: 20, marginBottom: 24, gap: 12 },
  actionRowDesktop: { flexDirection: 'row', paddingHorizontal: 32, gap: 16 },
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  jobCardDesktop: { flex: 1 },
  jobCardResident: { borderColor: '#FDE68A' },
  jobCardIcon: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  jobCardTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'right', marginBottom: 2 },
  jobCardSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right', lineHeight: 18 },

  // ── Banner
  banner: {
    marginHorizontal: 20, marginBottom: 28,
    backgroundColor: colors.primary, borderRadius: 20, padding: 22,
  },
  bannerDesktop: { flex: 1, marginHorizontal: 0, marginBottom: 0 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: colors.white, textAlign: 'right', marginBottom: 4 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 16 },
  bannerBtn: {
    flexDirection: 'row', alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, alignItems: 'center', gap: 6,
  },
  bannerBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },

  // ── Worker list / grid
  workerList: { paddingHorizontal: 20 },
  workerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 32, gap: 14,
  },
  workerGridCard: {
    flex: 1,
    minWidth: 280,
    marginBottom: 0,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
});
