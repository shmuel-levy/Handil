import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { ChatStackParamList } from '../../navigation/types';
import { getMyConversations } from '../../services/chatApi';
import { useAuthStore } from '../../store/authStore';
import { Conversation } from '../../types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'Conversations'>;

export default function ConversationsScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const load = useCallback(async () => {
    try {
      const { conversations: c } = await getMyConversations();
      setConversations(c);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function openChat(conv: Conversation) {
    const other = conv.participants.find((p) => p._id !== user?.id);
    if (!other) return;
    navigation.navigate('Chat', {
      conversationId: conv._id,
      otherUserId: other._id,
      otherUserName: other.name,
      jobPostTitle: conv.jobPost?.title,
    });
  }

  function getUnread(conv: Conversation): number {
    if (!user?.id || !conv.unreadCounts) return 0;
    return conv.unreadCounts[user.id] ?? 0;
  }

  function formatTime(isoDate: string | null): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000)   return 'עכשיו';
    if (diffMs < 3600000) return `לפני ${Math.floor(diffMs / 60000)} ד׳`;
    if (diffMs < 86400000) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הודעות</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const other = item.participants.find((p) => p._id !== user?.id);
            const unread = getUnread(item);
            return (
              <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.8}>
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, unread > 0 && styles.avatarActive]}>
                    <Text style={styles.avatarText}>{other?.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  </View>
                  {other?.role === 'worker' && (
                    <View style={styles.roleTag}>
                      <Ionicons name="construct" size={8} color={colors.white} />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.otherName, unread > 0 && styles.otherNameBold]}>
                      {other?.name ?? 'משתמש לא ידוע'}
                    </Text>
                    <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  {item.jobPost && (
                    <Text style={styles.jobContext} numberOfLines={1}>
                      <Ionicons name="briefcase-outline" size={10} color={colors.textMuted} />
                      {' '}{item.jobPost.title}
                    </Text>
                  )}
                  <View style={styles.rowBottom}>
                    <Text style={[styles.lastMsg, unread > 0 && styles.lastMsgBold]} numberOfLines={1}>
                      {item.lastMessage || 'התחל שיחה...'}
                    </Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>אין שיחות עדיין</Text>
              <Text style={styles.emptySub}>אחרי שדייר יאשר הצעה שלך — שיחה תיפתח כאן</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, textAlign: 'right' },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: colors.borderLight,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.primaryDark },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.white },
  roleTag: {
    position: 'absolute', bottom: 1, end: 1,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.surface,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  otherName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  otherNameBold: { fontWeight: '800' },
  timeText: { fontSize: 11, color: colors.textMuted },
  jobContext: { fontSize: 11, color: colors.textMuted, marginBottom: 3 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, color: colors.textMuted, flex: 1 },
  lastMsgBold: { color: colors.textPrimary, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: colors.primary, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginStart: 8,
  },
  unreadText: { fontSize: 10, fontWeight: '800', color: colors.white },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});
