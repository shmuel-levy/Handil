import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { PostsStackParamList } from '../../navigation/types';
import { acceptPost, closePost, getPost } from '../../services/postsApi';
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

  const [post, setPost] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    getPost(params.postId)
      .then(({ post: p }) => setPost(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.postId]);

  const isWorker = user?.role === 'worker';
  const isOwner = post?.resident._id === user?.id;
  const canAccept = isWorker && post?.status === 'open';
  const cat = post ? getCategoryBySlug(post.category) : null;

  const handleAccept = async () => {
    if (!post) return;
    Alert.alert(
      'קבל עבודה',
      `האם אתה בטוח שברצונך לקבל את העבודה "${post.title}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, קבל',
          style: 'default',
          onPress: async () => {
            setAccepting(true);
            try {
              const { post: updated } = await acceptPost(post._id);
              setPost(updated);
              Alert.alert('', 'קיבלת את העבודה בהצלחה! ניתן ליצור קשר עם הלקוח.', [
                { text: 'אישור' },
              ]);
            } catch (e: any) {
              Alert.alert('שגיאה', e?.response?.data?.message ?? 'לא ניתן לקבל את העבודה');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = async () => {
    if (!post) return;
    Alert.alert('סגור פוסט', 'האם לסגור את הפוסט? לא ניתן לשחזר.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'סגור',
        style: 'destructive',
        onPress: async () => {
          try {
            const { post: updated } = await closePost(post._id);
            setPost(updated);
          } catch {
            Alert.alert('שגיאה', 'לא ניתן לסגור את הפוסט');
          }
        },
      },
    ]);
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
              {post.resident.phone && isWorker && post.status === 'accepted' && post.acceptedBy?._id === user?.id && (
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

      {/* Footer actions */}
      {canAccept && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                <Text style={styles.acceptBtnText}>קבל עבודה</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isOwner && post.status === 'open' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>סגור פוסט</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 100 },
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
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
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  closeBtnText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
