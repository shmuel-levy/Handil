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

  useEffect(() => {
    getWorkers({ page: 1 })
      .then(({ workers }) => setTopWorkers(workers.slice(0, 10)))
      .catch(() => setTopWorkers([]))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
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

        {/* Hero search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>חפשו בעל מקצוע…</Text>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>קטגוריות</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}>
            <Text style={styles.sectionLink}>הכל</Text>
          </TouchableOpacity>
        </View>

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

        {/* Banner */}
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

        {/* Top Workers */}
        <View style={styles.sectionHeader}>
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
          <View style={styles.workerList}>
            {topWorkers.map((w) => (
              <WorkerCard
                key={w._id}
                worker={w}
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { fontSize: 20, fontWeight: '900', color: colors.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 24,
  },
  searchPlaceholder: { fontSize: 14, color: colors.textDisabled, flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  categoriesRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 24 },
  categoryPill: { alignItems: 'center', width: 72 },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  banner: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 22,
  },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: colors.white, textAlign: 'right', marginBottom: 4 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 16 },
  bannerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  bannerBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  workerList: { paddingHorizontal: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
});
