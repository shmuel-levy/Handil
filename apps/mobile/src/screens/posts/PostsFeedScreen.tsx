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
import ErrorState from '../../components/common/ErrorState';
import HazardStripe from '../../components/site/HazardStripe';
import WorkOrderTag from '../../components/site/WorkOrderTag';
import { SkeletonList } from '../../components/common/Skeleton';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { monoFont, plateEdge, radius } from '../../constants/theme';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { PostsStackParamList } from '../../navigation/types';
import { getMyPosts, getOpenPosts } from '../../services/postsApi';
import { getMyQuotes } from '../../services/quotesApi';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { getMyWorkerProfile, getRecommendedPosts, toggleAvailable } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { JobPost, Quote } from '../../types';
import { logger } from '../../utils/logger';

type Nav = NativeStackNavigationProp<PostsStackParamList>;

const URGENCY_LABEL: Record<string, string> = {
  urgent:   'דחוף',
  today:    'היום',
  week:     'השבוע',
  flexible: 'גמיש',
};

/** Urgency as a site priority level: [text, background] */
const URGENCY_STYLE: Record<string, { fg: string; bg: string }> = {
  urgent:   { fg: colors.white,     bg: colors.error },
  today:    { fg: colors.asphalt,   bg: colors.hazard },
  week:     { fg: colors.white,     bg: colors.blueprint },
  flexible: { fg: colors.textMuted, bg: colors.borderLight },
};

const STATUS_LABEL: Record<string, string> = {
  open:     'פתוח',
  accepted: 'נמצא בעל מקצוע',
  closed:   'סגור',
};

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post, isWorker, onPress, quoteCount = 0, onQuotesPress,
}: {
  post: JobPost;
  isWorker: boolean;
  onPress: () => void;
  quoteCount?: number;
  onQuotesPress?: () => void;
}) {
  const cat = getCategoryBySlug(post.category);
  const urgency = URGENCY_STYLE[post.urgency] ?? URGENCY_STYLE.flexible;
  const isClosed  = post.status === 'closed';
  const isUrgent  = post.urgency === 'urgent';
  const hasQuotes = !isWorker && quoteCount > 0 && post.status === 'open';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isClosed && styles.cardClosed,
        isUrgent && !isClosed && styles.cardUrgent,
        hasQuotes && styles.cardHasQuotes,
      ]}
      onPress={isClosed ? undefined : onPress}
      activeOpacity={isClosed ? 1 : 0.85}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, ${cat?.name_he ?? post.category}, ${URGENCY_LABEL[post.urgency] ?? ''}`}
    >
      {/* Urgent jobs are taped off like a hazard zone */}
      {isUrgent && !isClosed && (
        <View style={styles.urgentTape}>
          <HazardStripe height={8} stripe={10} />
          <View style={styles.urgentStrip}>
            <Ionicons name="warning" size={12} color={colors.hazard} />
            <Text style={styles.urgentStripText}>דחוף עכשיו</Text>
          </View>
        </View>
      )}

      {isClosed && (
        <View style={styles.closedBanner}>
          <Ionicons name="close-circle" size={14} color={colors.textMuted} />
          <Text style={styles.closedBannerText}>פוסט זה נסגר</Text>
        </View>
      )}

      {/* Quote arrival banner — shown for residents when pending quotes exist */}
      {hasQuotes && (
        <TouchableOpacity style={styles.quotesBanner} onPress={onQuotesPress} activeOpacity={0.85}>
          <View style={styles.quotesBannerLeft}>
            <Ionicons name="pricetag" size={14} color={colors.white} />
            <Text style={styles.quotesBannerText}>
              {quoteCount === 1 ? 'הצעת מחיר 1 ממתינה' : `${quoteCount} הצעות מחיר ממתינות`}
            </Text>
          </View>
          <Ionicons name="chevron-back" size={14} color={colors.white} />
        </TouchableOpacity>
      )}

      <View style={[styles.cardTop, isClosed && { opacity: 0.5 }]}>
        <View style={styles.catBadge}>
          <Ionicons name={(cat?.icon ?? 'briefcase-outline') as any} size={13} color={colors.hazardInk} />
          <Text style={styles.catBadgeText}>{cat?.name_he ?? post.category}</Text>
        </View>
        <View style={styles.cardTopEnd}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <Text style={[styles.urgencyText, { color: urgency.fg }]}>
              {URGENCY_LABEL[post.urgency]}
            </Text>
          </View>
          <WorkOrderTag id={post._id} />
        </View>
      </View>

      <Text style={[styles.postTitle, isClosed && { opacity: 0.45 }]}>{post.title}</Text>
      {post.description ? (
        <Text style={[styles.postDesc, isClosed && { opacity: 0.45 }]} numberOfLines={2}>
          {post.description}
        </Text>
      ) : null}

      {/* Perforation line, like the tear-off stub of a paper work order */}
      <View style={styles.perforation} />

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
  const [error, setError] = useState('');

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
        } catch (e: any) {
          // Deliberately non-fatal: this only decides whether to show the
          // "your quote was accepted" celebration. The feed below is the real
          // content and must still render if this lookup fails.
          logger.warn('PostsFeed', 'accepted-quote check failed', e?.message);
        }
      })();
    }, [isWorker, user?.id])
  );

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const { posts: p } = isWorker ? await getOpenPosts() : await getMyPosts();
      setPosts(p);
    } catch (e: any) {
      // Previously swallowed, so a failed load looked identical to "no posts yet"
      setError(e?.response?.data?.message ?? 'לא הצלחנו לטעון את העבודות. בדקו את החיבור');
    }
  }, [isWorker]);

  const loadRecommended = useCallback(async () => {
    if (!isWorker) return;
    setRecLoading(true);
    setError('');
    try {
      const { posts: p, isPersonalized } = await getRecommendedPosts();
      setRecPosts(p);
      setRecPersonalized(isPersonalized);
    } catch (e: any) {
      setRecPosts([]);
      setError(e?.response?.data?.message ?? 'לא הצלחנו לטעון את ההמלצות');
    } finally {
      setRecLoading(false);
    }
  }, [isWorker]);

  useEffect(() => {
    Promise.all([loadAll(), isWorker ? loadRecommended() : Promise.resolve()])
      .finally(() => setLoading(false));
  }, [loadAll, loadRecommended, isWorker]);

  // Read the real availability off the worker profile. This used to hardcode
  // `true`, so the toggle claimed "זמין" even for a worker who had turned
  // themselves off — and flipping it once would silently re-enable them.
  useEffect(() => {
    if (!isWorker) return;
    let cancelled = false;
    getMyWorkerProfile()
      .then(({ worker }) => {
        if (!cancelled) setAvailable(worker.isAvailable ?? true);
      })
      .catch(() => {
        // Leave the toggle at its current value rather than inventing one
      });
    return () => { cancelled = true; };
  }, [isWorker]);

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

  // Real-time: prepend new posts for workers
  useSocketEvent<{ post: JobPost }>('new_post', (data) => {
    if (!data?.post) return;
    setPosts((prev) => {
      if (prev.some((p) => p._id === data.post._id)) return prev;
      return [data.post, ...prev];
    });
  }, isWorker);

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
            {isWorker ? 'עבודות פתוחות' : 'הפרויקטים שלי'}
          </Text>
          <Text style={styles.headerSub}>
            {isWorker ? 'מצא עבודות שמתאימות לך' : 'לחץ על פרויקט לצפייה בהצעות המחיר'}
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
            <Ionicons name="add" size={24} color={colors.asphalt} />
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
            <Ionicons name="list-outline" size={14} color={activeTab === 'all' ? colors.asphalt : colors.onAsphaltMuted} />
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>כל העבודות</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}
            onPress={() => { setActiveTab('recommended'); if (recPosts.length === 0) loadRecommended(); }}
          >
            <Ionicons name="sparkles-outline" size={14} color={activeTab === 'recommended' ? colors.asphalt : colors.onAsphaltMuted} />
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
          <Ionicons name="sparkles" size={13} color={colors.blueprint} />
          <Text style={styles.recBannerText}>
            עבודות שמתאימות לעיר ולקטגוריות שלך — ממוינות לפי דחיפות
          </Text>
        </View>
      )}

      <HazardStripe height={6} stripe={9} />
      <View style={styles.body}>
      {loading || (activeTab === 'recommended' && recLoading) ? (
        <SkeletonList count={4} variant="post" />
      ) : error && displayedPosts.length === 0 ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : isDesktop ? (
        <ScrollView
          contentContainerStyle={styles.desktopGrid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {displayedPosts.length === 0 ? <EmptyState isWorker={isWorker} tab={activeTab} /> : (
            displayedPosts.map((item) => (
              <View key={item._id} style={styles.desktopCard}>
                <PostCard
                  post={item}
                  isWorker={isWorker}
                  onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
                  quoteCount={item.pendingQuoteCount ?? 0}
                  onQuotesPress={() => navigation.navigate('QuotesList', { postId: item._id, postTitle: item.title })}
                />
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
            <PostCard
              post={item}
              isWorker={isWorker}
              onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
              quoteCount={item.pendingQuoteCount ?? 0}
              onQuotesPress={() => navigation.navigate('QuotesList', { postId: item._id, postTitle: item.title })}
            />
          )}
          ListEmptyComponent={<EmptyState isWorker={isWorker} tab={activeTab} />}
        />
      )}
      </View>

      {/* FAB for residents */}
      {!isWorker && !loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="פרסם עבודה"
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
      <Ionicons name="clipboard-outline" size={52} color={colors.textDisabled} />
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
  safe: { flex: 1, backgroundColor: colors.asphalt },
  body: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.asphalt,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.onAsphalt, textAlign: 'right' },
  headerSub: { fontSize: 12, color: colors.onAsphaltMuted, textAlign: 'right', marginTop: 2 },
  newBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
    ...plateEdge(colors.hazardDark),
  },

  // Available now toggle
  availableRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.asphaltSoft, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.asphaltLine,
    paddingStart: 10, paddingEnd: 4, paddingVertical: 2,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availableLabel: { fontSize: 12, fontWeight: '800', color: colors.onAsphalt },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: colors.asphalt,
    paddingHorizontal: 12, gap: 6, paddingBottom: 10,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, position: 'relative',
    borderRadius: radius.md, backgroundColor: colors.asphaltSoft,
  },
  tabActive: { backgroundColor: colors.hazard, ...plateEdge(colors.hazardDark) },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.onAsphaltMuted },
  tabTextActive: { color: colors.asphalt, fontWeight: '900' },
  personalizedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, position: 'absolute', top: 8, end: 16 },

  // Recommended banner
  recBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.blueprintLight, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  recBannerText: { flex: 1, fontSize: 12, color: colors.blueprint, textAlign: 'right', lineHeight: 18, fontWeight: '600' },

  // Cards — paper work orders
  list: { padding: 16, paddingBottom: 110, gap: 12, backgroundColor: colors.background, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    ...plateEdge(colors.border, 3),
    overflow: 'hidden',
  },
  cardClosed: { backgroundColor: colors.borderLight },
  cardUrgent: { borderColor: colors.asphalt, borderWidth: 1.5, ...plateEdge(colors.asphalt, 4) },
  cardHasQuotes: { borderColor: colors.success, borderWidth: 1.5, ...plateEdge(colors.success, 4) },
  quotesBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.success,
    marginHorizontal: -16, marginTop: -16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  quotesBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quotesBannerText: { fontSize: 13, fontWeight: '800', color: colors.white },
  urgentTape: { marginHorizontal: -16, marginTop: -16, marginBottom: 12 },
  urgentStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.asphalt, paddingHorizontal: 12, paddingVertical: 5,
  },
  urgentStripText: { fontSize: 11, fontWeight: '900', color: colors.hazard, letterSpacing: 0.5 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.hazardLight, borderWidth: 1, borderColor: colors.hazard,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  catBadgeText: { fontSize: 12, fontWeight: '800', color: colors.hazardInk },
  urgencyBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  urgencyText: { fontSize: 11, fontWeight: '900' },
  postTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', marginBottom: 6, lineHeight: 24 },
  postDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 21, marginBottom: 12 },
  perforation: {
    borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    marginHorizontal: -16, marginBottom: 12,
  },
  cardBottom: { gap: 10 },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  residentAvatar: {
    width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.asphalt,
    alignItems: 'center', justifyContent: 'center',
  },
  residentAvatarText: { fontSize: 12, fontWeight: '800', color: colors.hazard },
  residentName: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, flex: 1, textAlign: 'right' },
  locationText: { fontSize: 11, color: colors.textMuted },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetChip: {
    backgroundColor: colors.asphalt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  budgetText: { fontFamily: monoFont, fontSize: 13, fontWeight: '700', color: colors.hazard },
  acceptHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  acceptHintText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  statusOpen: { backgroundColor: colors.successLight },
  statusTaken: { backgroundColor: colors.border },
  statusText: { fontSize: 12, fontWeight: '800' },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  closedBannerText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  // Desktop
  desktopGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 24, gap: 16, paddingBottom: 40,
    alignItems: 'flex-start', backgroundColor: colors.background, flexGrow: 1,
  },
  desktopCard: { flex: 1, minWidth: 320 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, flex: 1, width: '100%' as any },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textSecondary, textAlign: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // FAB — a squared steel plate, not a pill
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 13, borderRadius: radius.md,
    ...plateEdge(colors.primaryDark, 4),
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: '900' },

  // Notice modal
  noticeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  noticeCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 28, width: '100%', alignItems: 'center',
    overflow: 'hidden',
  },
  noticeIconWrap: {
    width: 80, height: 80, borderRadius: radius.lg, backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    ...plateEdge(colors.hazardDark, 4),
  },
  noticeEmoji: { fontSize: 40 },
  noticeTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  noticeQuoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8, width: '100%',
  },
  noticeQuoteTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  noticePhone: { fontFamily: monoFont, fontSize: 13, color: colors.primary, fontWeight: '700' },
  noticeSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 24 },
  noticeBtn: {
    backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: radius.md, width: '100%', alignItems: 'center',
    ...plateEdge(colors.primaryDark, 4),
  },
  noticeBtnText: { color: colors.white, fontSize: 16, fontWeight: '900' },
});
