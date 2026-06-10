import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkMyQuote } from '../../services/quotesApi';
import { Quote } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { PostsStackParamList } from '../../navigation/types';
import { closePost, getPost } from '../../services/postsApi';
import { useAuthStore } from '../../store/authStore';
import { JobPost } from '../../types';

type Nav = NativeStackNavigationProp<PostsStackParamList>;
type Route = RouteProp<PostsStackParamList, 'PostDetail'>;

const URGENCY_LABEL: Record<string, string> = {
  urgent: 'דחוף',
  today: 'היום',
  week: 'השבוע',
  flexible: 'גמיש',
};

export default function PostDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const user = useAuthStore((s) => s.user);

  const isWorker = user?.role === 'worker';

  const [post, setPost] = useState<JobPost | null>(null);
  const [quoteCount, setQuoteCount] = useState(0);
  const [myQuote, setMyQuote] = useState<Quote | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    getPost(params.postId)
      .then(({ post: p, quoteCount: qc }: any) => {
        setPost(p);
        setQuoteCount(qc ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.postId]);

  useFocusEffect(
    useCallback(() => {
      if (!isWorker) { setMyQuote(null); return; }
      checkMyQuote(params.postId)
        .then(({ quote }) => setMyQuote(quote))
        .catch(() => setMyQuote(null));
    }, [params.postId, isWorker])
  );
  const isOwner = post?.resident?._id === user?.id;
  const cat = post ? getCategoryBySlug(post.category) : null;

  const handleClose = async () => {
    if (!post || closing) return;
    setClosing(true);
    try {
      const { post: updated } = await closePost(post._id);
      setPost(updated);
      setConfirmClose(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לסגור את הפוסט');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.error }}>לא נמצא פוסט</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Category + urgency */}
        <View style={styles.topRow}>
          <View style={styles.catBadge}>
            <Ionicons name={(cat?.icon ?? 'briefcase-outline') as any} size={14} color={colors.primary} />
            <Text style={styles.catText}>{cat?.name_he ?? post.category}</Text>
          </View>
          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyText}>{URGENCY_LABEL[post.urgency]}</Text>
          </View>
        </View>

        {/* Status banner */}
        {post.status !== 'open' && (
          <View style={[styles.statusBanner, post.status === 'accepted' ? styles.bannerAccepted : styles.bannerClosed]}>
            <Ionicons
              name={post.status === 'accepted' ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={post.status === 'accepted' ? colors.success : colors.textMuted}
            />
            <Text style={[styles.statusBannerText, { color: post.status === 'accepted' ? colors.success : colors.textMuted }]}>
              {post.status === 'accepted' ? 'נמצא בעל מקצוע לעבודה' : 'הפוסט נסגר'}
            </Text>
          </View>
        )}

        <Text style={styles.title}>{post.title}</Text>
        {post.description ? (
          <Text style={styles.description}>{post.description}</Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {post.budget ? (
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={16} color={colors.success} />
              <Text style={styles.statValue}>₪{post.budget.toLocaleString('he-IL')}</Text>
              <Text style={styles.statLabel}>תקציב</Text>
            </View>
          ) : null}
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{post.location}</Text>
            <Text style={styles.statLabel}>מיקום</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.statValue}>{new Date(post.createdAt).toLocaleDateString('he-IL')}</Text>
            <Text style={styles.statLabel}>פורסם</Text>
          </View>
        </View>

        {/* Resident info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרסם על ידי</Text>
          <View style={styles.personCard}>
            <View style={styles.personAvatar}>
              <Text style={styles.personAvatarText}>{post.resident.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{post.resident.name}</Text>
              {!!post.resident.phone && isWorker && post.status === 'accepted' && post.acceptedBy?._id === user?.id && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${post.resident.phone}`)}
                  style={styles.callBtn}
                >
                  <Ionicons name="call-outline" size={14} color={colors.success} />
                  <Text style={styles.callBtnText}>{post.resident.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Accepted by */}
        {post.acceptedBy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>בעל מקצוע שקיבל</Text>
            <View style={styles.personCard}>
              <View style={[styles.personAvatar, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.personAvatarText, { color: colors.success }]}>
                  {post.acceptedBy.name.charAt(0)}
                </Text>
              </View>
              <Text style={styles.personName}>{post.acceptedBy.name}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer — quote actions */}
      {post.status === 'open' && isWorker && (
        <View style={styles.footer}>
          {myQuote === undefined ? (
            <ActivityIndicator color={colors.primary} />
          ) : myQuote ? (
            /* Already submitted a quote */
            <View style={styles.myQuoteBanner}>
              <Ionicons name="checkmark-circle" size={18}
                color={myQuote.status === 'accepted' ? colors.success : myQuote.status === 'rejected' ? colors.error : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.myQuoteTitle}>
                  {myQuote.status === 'pending'  && 'הצעתך בהמתנה'}
                  {myQuote.status === 'accepted' && '🎉 הצעתך התקבלה!'}
                  {myQuote.status === 'rejected' && 'הצעתך נדחתה'}
                </Text>
                <Text style={styles.myQuotePrice}>₪{myQuote.proposedPrice.toLocaleString('he-IL')}</Text>
              </View>
            </View>
          ) : (
            /* Not submitted yet */
            <TouchableOpacity
              style={styles.quoteBtn}
              onPress={() => navigation.navigate('QuoteSubmit', { postId: post._id, postTitle: post.title })}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane-outline" size={20} color={colors.white} />
              <Text style={styles.quoteBtnText}>שלח הצעת מחיר</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Owner footer — quotes + close in one container */}
      {isOwner && (
        <View style={styles.footer}>
          {post.status !== 'closed' && (
            <TouchableOpacity
              style={styles.quotesViewBtn}
              onPress={() => navigation.navigate('QuotesList', { postId: post._id, postTitle: post.title })}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.quotesViewBtnText}>
                {quoteCount > 0 ? `${quoteCount} הצעות מחיר — בחר בעל מקצוע` : 'הצעות מחיר (0)'}
              </Text>
              <Ionicons name="chevron-back" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
          {post.status === 'open' && (
            <View style={{ marginTop: 10 }}>
              {confirmClose ? (
                <View style={styles.confirmRow}>
                  <TouchableOpacity
                    style={[styles.confirmYes, closing && { opacity: 0.6 }]}
                    onPress={handleClose}
                    disabled={closing}
                  >
                    {closing ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.confirmYesText}>כן, סגור פוסט</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmNo}
                    onPress={() => setConfirmClose(false)}
                  >
                    <Text style={styles.confirmNoText}>ביטול</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.closeBtn} onPress={() => setConfirmClose(true)}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={styles.closeBtnText}>סגור פוסט</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 180 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  catText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  urgencyText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerAccepted: { backgroundColor: colors.successLight },
  bannerClosed: { backgroundColor: colors.border },
  statusBannerText: { fontSize: 13, fontWeight: '600' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    lineHeight: 32,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 26,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
  personName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  callBtnText: { fontSize: 13, color: colors.success, fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  acceptBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.error,
    paddingVertical: 14, borderRadius: 14,
  },
  closeBtnText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  // Quote system
  quoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14,
  },
  quoteBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  myQuoteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primaryLight, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: colors.primary + '30',
  },
  myQuoteTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  myQuotePrice: { fontSize: 20, fontWeight: '900', color: colors.primary, marginTop: 2 },
  quotesViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 15,
    borderWidth: 1.5, borderColor: colors.primary + '40',
  },
  quotesViewBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmYes: {
    flex: 1, backgroundColor: colors.error,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
  },
  confirmYesText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  confirmNo: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
  },
  confirmNoText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
