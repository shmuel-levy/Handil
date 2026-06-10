import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { ChatStackParamList } from '../../navigation/types';
import { getMessages, sendMessageRest } from '../../services/chatApi';
import { connectSocket, getSocket } from '../../services/socketClient';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage } from '../../types';

type Nav   = NativeStackNavigationProp<ChatStackParamList, 'Chat'>;
type Route = RouteProp<ChatStackParamList, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const flatRef = useRef<FlatList>(null);

  // Load history
  useEffect(() => {
    getMessages(params.conversationId)
      .then(({ messages: m }) => setMessages(m))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.conversationId]);

  // Connect Socket.io and join the conversation room
  useEffect(() => {
    let mounted = true;
    connectSocket().then((socket) => {
      if (!mounted) return;

      socket.emit('join_conversation', { conversationId: params.conversationId });

      socket.on('new_message', (msg: ChatMessage) => {
        if (msg.conversation === params.conversationId) {
          setMessages((prev) => [...prev, msg]);
          // Mark as read
          socket.emit('mark_read', { conversationId: params.conversationId });
        }
      });
    });

    return () => {
      mounted = false;
      const socket = getSocket();
      if (socket) {
        socket.emit('leave_conversation', { conversationId: params.conversationId });
        socket.off('new_message');
      }
    };
  }, [params.conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);

    // Optimistic add
    const optimistic: ChatMessage = {
      _id: `tmp_${Date.now()}`,
      conversation: params.conversationId,
      sender: { _id: user?.id ?? '', name: user?.name ?? '', avatar: user?.avatar ?? '', role: user?.role ?? '' },
      text: trimmed,
      readBy: [user?.id ?? ''],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // Try Socket.io first
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('send_message', { conversationId: params.conversationId, text: trimmed });
      } else {
        // REST fallback
        await sendMessageRest(params.conversationId, trimmed);
      }
    } catch {
      // keep the optimistic message even on error
    } finally {
      setSending(false);
    }
  }, [text, sending, params.conversationId, user]);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{params.otherUserName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{params.otherUserName}</Text>
            {params.jobPostTitle && (
              <Text style={styles.headerSub} numberOfLines={1}>
                <Ionicons name="briefcase-outline" size={10} color={colors.textMuted} />
                {' '}{params.jobPostTitle}
              </Text>
            )}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item, index }) => {
              const isMe = item.sender._id === user?.id;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showAvatar = !isMe && (!prevMsg || prevMsg.sender._id !== item.sender._id);
              return (
                <MessageBubble
                  msg={item}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  time={formatTime(item.createdAt)}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={40} color={colors.textDisabled} />
                <Text style={styles.emptyChatText}>שלח הודעה ראשונה!</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="paper-plane" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="כתוב הודעה..."
            placeholderTextColor={colors.textDisabled}
            multiline
            maxLength={1000}
            textAlign="right"
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  msg, isMe, showAvatar, time,
}: { msg: ChatMessage; isMe: boolean; showAvatar: boolean; time: string }) {
  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
      {!isMe && (
        <View style={[styles.miniAvatar, !showAvatar && { opacity: 0 }]}>
          <Text style={styles.miniAvatarText}>{msg.sender.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
          {time}
          {isMe && (
            <Text> {msg.readBy.length > 1 ? ' ✓✓' : ' ✓'}</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: colors.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 15, fontWeight: '800', color: colors.white },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  headerSub: { fontSize: 11, color: colors.textMuted },

  // Messages
  msgList: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 2 },
  bubbleRowMe:    { justifyContent: 'flex-start' },
  bubbleRowOther: { justifyContent: 'flex-end' },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 11, fontWeight: '700', color: colors.white },
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
  },
  bubbleMe: {
    backgroundColor: colors.primary, borderBottomStartRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderBottomEndRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextMe:    { color: colors.white },
  bubbleTextOther: { color: colors.textPrimary, textAlign: 'right' },
  bubbleTime: { fontSize: 10, marginTop: 3 },
  bubbleTimeMe:    { color: 'rgba(255,255,255,0.65)', textAlign: 'left' },
  bubbleTimeOther: { color: colors.textMuted, textAlign: 'right' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderColor: colors.border, gap: 10,
  },
  textInput: {
    flex: 1, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary,
    maxHeight: 120, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.45 },

  // Empty
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyChatText: { fontSize: 14, color: colors.textMuted },
});
