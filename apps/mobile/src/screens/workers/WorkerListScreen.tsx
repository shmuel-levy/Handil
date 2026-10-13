import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonList } from '../../components/common/Skeleton';
import WorkerCard from '../../components/workers/WorkerCard';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { plateEdge, radius } from '../../constants/theme';
import { HomeStackParamList, SearchStackParamList } from '../../navigation/types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getWorkers } from '../../services/workersApi';
import { WorkerProfile } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList & SearchStackParamList>;

export default function WorkerListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<HomeStackParamList, 'WorkerList'>>();
  const initialCategory = route.params?.category ?? '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Wait for typing to settle before hitting the API
  const debouncedQuery = useDebouncedValue(query, 350);

  const fetchWorkers = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const { workers: data } = await getWorkers({
          category: selectedCategory || undefined,
          q: debouncedQuery.trim() || undefined,
        });
        setWorkers(data);
      } catch (e: any) {
        setWorkers([]);
        setError(e?.response?.data?.message ?? 'לא הצלחנו לטעון את בעלי המקצוע. נסו שוב');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, debouncedQuery]
  );

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return (
    // Both stacks that show this screen render a header, which already covers
    // the top inset and the back button — the duplicates used to sit under it.
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש בעל מקצוע…"
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
            accessibilityLabel="חיפוש בעל מקצוע לפי שם"
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {[{ slug: '', name_he: 'הכל', icon: 'apps-outline' }, ...CATEGORIES].map((item) => {
          const active = selectedCategory === item.slug;
          return (
            <TouchableOpacity
              key={item.slug}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedCategory(item.slug)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.name_he}
            >
              <Ionicons
                name={item.icon as any}
                size={13}
                color={active ? colors.asphalt : colors.steel}
              />
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
                numberOfLines={1}
              >
                {item.name_he}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <SkeletonList count={5} variant="worker" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchWorkers()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={workers}
          keyExtractor={(w) => w._id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => fetchWorkers(true)}
          renderItem={({ item }) => (
            <WorkerCard
              worker={item}
              onPress={() =>
                navigation.navigate('WorkerDetail', {
                  workerId: item._id,
                  workerName: item.user.name,
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>לא נמצאו בעלי מקצוע</Text>
              <Text style={styles.emptySubtitle}>נסו קטגוריה אחרת או שנו את החיפוש</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    backgroundColor: colors.asphalt,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    ...plateEdge(colors.primary, 3),
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  chipScroll: { height: 54, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  chipRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.hazard, borderColor: colors.asphalt },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  chipTextActive: { color: colors.asphalt, fontWeight: '900' },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textSecondary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
});
