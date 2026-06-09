import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkerCard from '../../components/workers/WorkerCard';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { HomeStackParamList, SearchStackParamList } from '../../navigation/types';
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

  const fetchWorkers = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const { workers: data } = await getWorkers({
          category: selectedCategory || undefined,
          q: query || undefined,
        });
        setWorkers(data);
      } catch {
        setWorkers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, query]
  );

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש בעל מקצוע…"
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
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
            >
              <Ionicons
                name={item.icon as any}
                size={13}
                color={active ? '#fff' : colors.primary}
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
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <FlatList
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chipRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 7, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
});
