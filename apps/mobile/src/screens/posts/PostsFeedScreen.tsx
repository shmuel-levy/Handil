import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { getMyQuotes } from '../../services/quotesApi';
import { getRecommendedPosts, toggleAvailable } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { JobPost, Quote } from '../../types';

type Nav = NativeStackNavigationProp<PostsStackParamList>;

const URGENCY_LABEL: Record<string, string> = {
  urgent: '🔴 דחוף',
  today:  '🟡 היום',
  week:   '🔵 השבוע',
  flexible: '⚪ גמיש',
};

const URGENCY_COLOR: Record<string, string> = {
  urgent:   colors.error,
  today:    '#F59E0B',
  week:     colors.primary,
  flexible: colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  open:     'פתוח',
  accepted: 'נמצא בעל מקצוע',
  closed:   'סגור',
};

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, isWorker, onPress }: { post: JobPost; isWorker: boolean; onPress: () => void }) {
  const cat = getCategoryBySlug(post.category);
  const urgencyColor = URGENCY_COLOR[post.urgency] ?? colors.textMuted;
  const isClosed  = post.status === 'closed';
  const isUrgent  = post.urgency === 'urgent';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isClosed && styles.cardClosed,
        isUrgent && !isClosed && styles.cardUrgent,
      ]}
      onPress={isClosed ? undefined : onPress}
      activeOpacity={isClosed ? 1 : 0.85}
    >
      {/* Urgent strip */}
      {isUrgent && !isClosed && (
        <View style={styles.urgentStrip}>
          <Ionicons name="flash" size={12} color={colors.white} />
          <Text style={styles.urgentStripText}>דחוף עכשיו</Text>
        </View>
      )}

      {isClosed && (
        <View style={styles.closedBanner}>
          <Ionicons name="close-circle" size={14} color={colors.textMuted} />
          <Text style={styles.closedBannerText}>פוסט זה נסגר</Text>
        </View>
      )}

      <View style={[styles.cardTop, isClosed && { opacity: 0.5 }]}>
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

      <Text style={[styles.postTitle, isClosed && { opacity: 0.45 }]}>{post.title}</Text>
      {post.description ? (
        <Text style={[styles.postDesc, isClosed && { opacity: 0.45 }]} numberOfLines={2}>
          {post.description}
        </Text>
      ) : null}

      <View style={[styles.cardBottom, isClosed && { opacity: 0.45 }]}>
        <View style={styles.residentRow}>
          <View style={styles.residentAvatar}>
            <Text style={styles.residentAvatarText}>
              {typeof post.resident === 'object' ? post.resident.name?.charAt(0) ?? '?' : '?'}
            </Text>
          </View>
          <Text style={styles.residentName}>
            {typeof post.resident === 'object' ? post.resident.name : ''}
          </Text>
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
              <Ionicons name="paper-plane-outline" size={12} color={colors.primary} />
              <Text style={styles.acceptHintText}>שלח הצעה</Text>
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PostsFeedScreen() {
  const navigation  = useNavigation<Nav>();
  const user        = useAuthStore((s) => s.user);
  const updateUser  = useAuthStore((s) => s.updateUser);
  const isWorker    = user?.role === 'worker';
  const { isDesktop } = useBreakpoint();

  type Tab = 'all' | 'recommended';
  const [activeTab, setActiveTab]       = useState<Tab>('all');
  const [posts, setPosts]               = useState<JobPost[]>([]);
  const [recPosts, setRecPosts]         = useState<JobPost[]>([]);
  const [recPersonalized, setRecPersonalized] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [recLoading, setRecLoading]     = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [available, setAvailable]       = useState<boolean>(true);
  const [availToggling, setAvailToggling] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState<Quote[]>([]);

  // Accepted-quote notification
  useFocusEffect(
    useCallback(() => {
      if (!isWorker || !user?.id) return;
      (async () => {
        try {
          const { quotes } = await getMyQuotes();
          const accepted = quotes.filter((q) => q.status === 'accepted');
          if (accepted.length === 0) return;
          const key = `handil_seen_accepted_${user.id}`;
          const raw = await AsyncStorage.getItem(key);
          const seenIds: string[] = raw ? JSON.parse(raw) : [];
          const unseen = accepted.filter((q) => !seenIds.includes(q._id));
          if (unseen.length > 0) setAcceptedNotice(unseen);
        } catch {}
      })();
    }, [isWorker, user?.id])
  );

  const loadAll = useCallback(async () => {
    try {
      if (isWorker) {
        const { posts: p } = await getOpenPosts();
        setPosts(p);
      } else {
        const { posts: p } = await getMyPosts();
        setPosts(p);
      }
    } catch {}
  }, [isWorker]);

  const loadRecommended = useCallback(async () => {
    if (!isWorker) return;
    setRecLoading(true);
    try {
      const { posts: p, isPersonalized } = await getRecommendedPosts();
      setRecPosts(p);
      setRecPersonalized(isPersonalized);
    } catch {
      setRecPosts([]);
    } finally {
      setRecLoading(false);
    }
  }, [isWorker]);

  useEffect(() => {
    Promise.all([loadAll(), isWorker ? loadRecommended() : Promise.resolve()])
      .finally(() => setLoading(false));
  }, [loadAll, loadRecommended, isWorker]);

  // Sync available toggle from user/worker profile
  useEffect(() => {
    // We don't have worker profile here; default to true
    setAvailable(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), activeTab === 'recommended' ? loadRecommended() : Promise.resolve()]);
    setRefreshing(false);
  }, [loadAll, loadRecommended, activeTab]);

  const dismissNotice = async () => {
    if (!user?.id) return;
    const key = `handil_seen_accepted_${user.id}`;
    const raw = await AsyncStorage.getItem(key);
    const seenIds: string[] = raw ? JSON.parse(raw) : [];
    const newIds = [...new Set([...seenIds, ...acceptedNotice.map((q) => q._id)])];
    await AsyncStorage.setItem(key, JSON.stringify(newIds));
    setAcceptedNotice([]);
  };

  const handleToggleAvailable = async (val: boolean) => {
    setAvailable(val);
    setAvailToggling(true);
    try {
      await toggleAvailable(val);
    } catch {
      setAvailable(!val); // revert on error
    } finally {
      setAvailToggling(false);
    }
  };

  const displayedPosts = activeTab === 'recommended' ? recPosts : posts;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Accepted quote notification */}
      <Modal visible={acceptedNotice.length > 0} transparent animationType="fade">
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIconWrap}>
              <Text style={styles.noticeEmoji}>🎉</Text>
            </View>
            <Text style={styles.noticeTitle}>
              {acceptedNotice.length === 1 ? 'הצעתך התקבלה!' : `${acceptedNotice.length} הצעות התקבלו!`}
            </Text>
            {acceptedNotice.map((q) => {
              const post = typeof q.jobPost === 'object' ? q.jobPost : null;
              return (
                <View key={q._id} style={styles.noticeQuoteRow}>
                  <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
                  <Text style={styles.noticeQuoteTitle} numberOfLines={1}>
                    {(post as any)?.title ?? 'עבודה'}
                  </Text>
                  {(post as any)?.resident?.phone ? (
                    <Text style={styles.noticePhone}>{(post as any).resident.phone}</Text>
                  ) : null}
                </View>
              );
            })}
            <Text style={styles.noticeSub}>צור קשר עם הלקוח כדי לקבוע מועד לביצוע העבודה.</Text>
            <TouchableOpacity style={styles.noticeBtn} onPress={dismissNotice} activeOpacity={0.85}>
              <Text style={styles.noticeBtnText}>הבנתי, תודה!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isWorker ? 'עבודות פתוחות' : 'הפוסטים שלי'}
          </Text>
          <Text style={styles.headerSub}>
            {isWorker ? 'מצא עבודות שמתאימות לך' : 'נהל את בקשות העבודה שלך'}
          </Text>
        </View>

        {/* Available now toggle for workers */}
        {isWorker && (
          <View style={styles.availableRow}>
            <View style={[styles.availDot, { backgroundColor: available ? colors.success : colors.textDisabled }]} />
            <Text style={styles.availableLabel}>{available ? 'זמין' : 'לא זמין'}</Text>
            <Switch
              value={available}
              onValueChange={handleToggleAvailable}
              disabled={availToggling}
              trackColor={{ false: colors.border, true: colors.success + '80' }}
              thumbColor={available ? colors.success : colors.textDisabled}
              ios_backgroundColor={colors.border}
            />
          </View>
        )}

        {!isWorker && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Worker tabs: כל העבודות | מומלץ לך */}
      {isWorker && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Ionicons name="list-outline" size={14} color={activeTab === 'all' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>כל העבודות</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}
            onPress={() => { setActiveTab('recommended'); if (recPosts.length === 0) loadRecommended(); }}
          >
            <Ionicons name="sparkles-outline" size={14} color={activeTab === 'recommended' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>
              מומלץ לך
            </Text>
            {recPersonalized && activeTab === 'recommended' && (
              <View style={styles.personalizedDot} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Recommended banner */}
      {isWorker && activeTab === 'recommended' && recPersonalized && recPosts.length > 0 && (
        <View style={styles.recBanner}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={styles.recBannerText}>
            עבודות שמתאימות לעיר ולקטגוריות שלך — ממוינות לפי דחיפות
          </Text>
        </View>
      )}

      {loading || (activeTab === 'recommended' && recLoading) ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isDesktop ? (
        <ScrollView
          contentContainerStyle={styles.desktopGrid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {displayedPosts.length === 0 ? <EmptyState isWorker={isWorker} tab={activeTab} /> : (
            displayedPosts.map((item) => (
              <View key={item._id} style={styles.desktopCard}>
                <PostCard post={item} isWorker={isWorker} onPress={() => navigation.navigate('PostDetail', { postId: item._id })} />
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={displayedPosts}
          keyExtractor={(p) => p._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <PostCard post={item} isWorker={isWorker} onPress={() => navigation.navigate('PostDetail', { postId: item._id })} />
          )}
          ListEmptyComponent={<EmptyState isWorker={isWorker} tab={activeTab} />}
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

function EmptyState({ isWorker, tab }: { isWorker: boolean; tab: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={52} color={colors.textDisabled} />
      <Text style={styles.emptyTitle}>
        {tab === 'recommended' ? 'לא נמצאו עבודות מתאימות' : isWorker ? 'אין עבודות פתוחות כרגע' : 'עדיין לא פרסמת עבודות'}
      </Text>
      <Text style={styles.emptyText}>
        {tab === 'recommended' ? 'עדכן את הפרופיל שלך עם עיר וקטגוריות' : isWorker ? 'בדוק שוב בקרוב' : 'לחץ + כדי לפרסם עבודה חדשה'}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  headerSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  // Available now toggle
  availableRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availableLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, position: 'relative',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  personalizedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, position: 'absolute', top: 8, end: 16 },

  // Recommended banner
  recBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8,
  },
  recBannerText: { flex: 1, fontSize: 12, color: colors.primary, textAlign: 'right', lineHeight: 18 },

  // Cards
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  cardClosed: { backgroundColor: colors.borderLight, borderColor: colors.border },
  cardUrgent: { borderColor: colors.error, borderWidth: 1.5 },
  urgentStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 5,
    marginHorizontal: -16, marginTop: -16, marginBottom: 12,
  },
  urgentStripText: { fontSize: 11, fontWeight: '800', color: colors.white },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  catBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  postTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 6, lineHeight: 24 },
  postDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 21, marginBottom: 12 },
  cardBottom: { gap: 10 },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  residentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  residentAvatarText: { fontSize: 12, fontWeight: '700', color: colors.white },
  residentName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, flex: 1, textAlign: 'right' },
  locationText: { fontSize: 11, color: colors.textMuted },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetChip: { backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  budgetText: { fontSize: 13, fontWeight: '700', color: colors.success },
  acceptHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  acceptHintText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusOpen: { backgroundColor: colors.successLight },
  statusTaken: { backgroundColor: colors.border },
  statusText: { fontSize: 12, fontWeight: '700' },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  closedBannerText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  // Desktop
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 24, gap: 16, paddingBottom: 40, alignItems: 'flex-start' },
  desktopCard: { flex: 1, minWidth: 320 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, flex: 1, width: '100%' as any },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  // Notice modal
  noticeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  noticeCard: {
    backgroundColor: colors.surface, borderRadius: 24, padding: 28, width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  noticeIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noticeEmoji: { fontSize: 40 },
  noticeTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  noticeQuoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, marginBottom: 8, width: '100%' },
  noticeQuoteTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryDark, textAlign: 'right' },
  noticePhone: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  noticeSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 24 },
  noticeBtn: {
    backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 16, width: '100%', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  noticeBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
