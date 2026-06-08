import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { PostsStackParamList } from '../../navigation/types';
import { getMyPosts, getOpenPosts } from '../../services/postsApi';
import { useAuthStore } from '../../store/authStore';
import { JobPost } from '../../types';

type Nav = NativeStackNavigationProp<PostsStackParamList>;

const URGENCY_LABEL: Record<string, string> = {
  urgent: 'דחוף',
  today: 'היום',
  week: 'השבוע',
  flexible: 'גמיש',
};

const URGENCY_COLOR: Record<string, string> = {
  urgent: colors.error,
  today: '#F59E0B',
  week: colors.primary,
  flexible: colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  open: 'פתוח',
  accepted: 'נמצא בעל מקצוע',
  closed: 'סגור',
};

function PostCard({
  post,
  isWorker,
  onPress,
}: {
  post: JobPost;
  isWorker: boolean;
  onPress: () => void;
}) {
  const cat = getCategoryBySlug(post.category);
  const urgencyColor = URGENCY_COLOR[post.urgency] ?? colors.textMuted;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.catBadge}>
          <Ionicons name={(cat?.icon ?? 'briefcase-outline') as any} size={13} color={colors.primary} />
          <Text style={styles.catBadgeText}>{cat?.name_he ?? post.category}</Text>
        </View>
        <View style={[styles.urgencyBadge, { borderColor: urgencyColor }]}>
          <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {URGENCY_LABEL[post.urgency]}
          </Text>
        </View>
      </View>

      <Text style={styles.postTitle}>{post.title}</Text>
      {post.description ? (
        <Text style={styles.postDesc} numberOfLines={2}>
          {post.description}
        </Text>
      ) : null}

      <View style={styles.cardBottom}>
        <View style={styles.residentRow}>
          <View style={styles.residentAvatar}>
            <Text style={styles.residentAvatarText}>{post.resident.name.charAt(0)}</Text>
          </View>
          <Text style={styles.residentName}>{post.resident.name}</Text>
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            {' '}{post.location}
          </Text>
        </View>

        <View style={styles.priceRow}>
          {post.budget ? (
            <View style={styles.budgetChip}>
              <Text style={styles.budgetText}>₪{post.budget.toLocaleString('he-IL')}</Text>
            </View>
          ) : null}
          {isWorker && post.status === 'open' && (
            <View style={styles.acceptHint}>
              <Text style={styles.acceptHintText}>קבל עבודה</Text>
              <Ionicons name="chevron-back" size={12} color={colors.primary} />
            </View>
          )}
          {!isWorker && (
            <View style={[styles.statusChip, post.status === 'open' ? styles.statusOpen : styles.statusTaken]}>
              <Text style={[styles.statusText, { color: post.status === 'open' ? colors.success : colors.textMuted }]}>
                {STATUS_LABEL[post.status]}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PostsFeedScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const isWorker = user?.role === 'worker';
  const { isDesktop } = useBreakpoint();

  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isWorker) {
        const { posts: p } = await getOpenPosts();
        setPosts(p);
      } else {
        const { posts: p } = await getMyPosts();
        setPosts(p);
      }
    } catch {
      // keep empty list
    }
  }, [isWorker]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isWorker ? 'עבודות פתוחות' : 'הפוסטים שלי'}
          </Text>
          <Text style={styles.headerSub}>
            {isWorker ? 'בחר עבודה שמתאימה לך' : 'נהל את בקשות העבודה שלך'}
          </Text>
        </View>
        {!isWorker && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isDesktop ? (
        /* Desktop: 2-column wrapped grid */
        <ScrollView
          contentContainerStyle={styles.desktopGrid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={52} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>{isWorker ? 'אין עבודות פתוחות כרגע' : 'עדיין לא פרסמת עבודות'}</Text>
              <Text style={styles.emptyText}>{isWorker ? 'בדוק שוב בקרוב' : 'לחץ + כדי לפרסם עבודה חדשה'}</Text>
            </View>
          ) : posts.map((item) => (
            <View key={item._id} style={styles.desktopCard}>
              <PostCard post={item} isWorker={isWorker} onPress={() => navigation.navigate('PostDetail', { postId: item._id })} />
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Mobile: vertical FlatList */
        <FlatList
          data={posts}
          keyExtractor={(p) => p._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isWorker={isWorker}
              onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={52} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>{isWorker ? 'אין עבודות פתוחות כרגע' : 'עדיין לא פרסמת עבודות'}</Text>
              <Text style={styles.emptyText}>{isWorker ? 'בדוק שוב בקרוב' : 'לחץ + כדי לפרסם עבודה חדשה'}</Text>
            </View>
          }
        />
      )}

      {/* FAB for residents */}
      {!isWorker && !loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color={colors.white} />
          <Text style={styles.fabText}>פרסם עבודה</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  headerSub: { fontSize: 13, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  catBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 24,
  },
  postDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 21,
    marginBottom: 12,
  },
  cardBottom: { gap: 10 },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  residentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentAvatarText: { fontSize: 12, fontWeight: '700', color: colors.white },
  residentName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, flex: 1, textAlign: 'right' },
  locationText: { fontSize: 11, color: colors.textMuted },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetChip: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  budgetText: { fontSize: 13, fontWeight: '700', color: colors.success },
  acceptHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  acceptHintText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusOpen: { backgroundColor: colors.successLight },
  statusTaken: { backgroundColor: colors.border },
  statusText: { fontSize: 12, fontWeight: '700' },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 24,
    gap: 16,
    paddingBottom: 40,
    alignItems: 'flex-start',
  },
  desktopCard: { flex: 1, minWidth: 320 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, flex: 1, width: '100%' as any },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
