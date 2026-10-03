import React, { useEffect } from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NotificationBanner from '../components/common/NotificationBanner';
import { SIDEBAR_WIDTH } from '../components/layout/WebSidebar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import RootNavigator from '../navigation/RootNavigator';
import { disconnectSocket } from '../services/socketClient';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { colors } from '../constants/colors';

// Enable RTL for Hebrew — safe to call multiple times (no-op if already RTL)
I18nManager.allowRTL(true);
if (Platform.OS !== 'web' && !I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  // Note: Expo Go requires a manual reload after first RTL enable
}

// Web: set document direction so browser layout flips to RTL
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}

function useGlobalSocket() {
  const user    = useAuthStore((s) => s.user);
  const addNote = useNotificationStore((s) => s.add);
  const isSignedIn = !!user;

  // Tear the socket down on sign-out so the next user never inherits it
  useEffect(() => {
    if (!isSignedIn) disconnectSocket();
  }, [isSignedIn]);

  // Each subscription owns its own listener reference. The previous version
  // called socket.off('new_quote') with no handler, which removes EVERY
  // listener for that event — including the ones individual screens had
  // registered, silently killing their live updates.
  useSocketEvent<{ postTitle: string; quote: { workerName: string; proposedPrice: number } }>(
    'new_quote',
    (data) => {
      const name  = data?.quote?.workerName ?? '';
      const price = data?.quote?.proposedPrice?.toLocaleString('he-IL') ?? '';
      addNote({
        type: 'info',
        title: 'הצעה חדשה התקבלה',
        subtitle: name + ' הציע ₪' + price,
      });
    },
    isSignedIn,
  );

  useSocketEvent<{ postTitle: string; price: number }>(
    'quote_accepted',
    (data) => {
      addNote({ type: 'success', title: 'הצעתך התקבלה! 🎉', subtitle: data?.postTitle ?? undefined });
    },
    isSignedIn,
  );

  useSocketEvent<{ postTitle: string }>(
    'quote_rejected',
    (data) => {
      addNote({ type: 'warning', title: 'הצעתך נדחתה', subtitle: data?.postTitle ?? undefined });
    },
    isSignedIn,
  );

  useSocketEvent<{ post: { title: string; category: string } }>(
    'new_post',
    (data) => {
      if (user?.role !== 'worker') return;
      addNote({ type: 'info', title: 'עבודה חדשה פורסמה', subtitle: data?.post?.title ?? undefined });
    },
    isSignedIn,
  );

  useSocketEvent<{ status: string }>(
    'booking_updated',
    (data) => {
      const STATUS_HE: Record<string, string> = {
        accepted:  'אושרה',
        rejected:  'נדחתה',
        completed: 'הושלמה',
        cancelled: 'בוטלה',
      };
      const label = STATUS_HE[data?.status];
      if (!label) return;
      addNote({
        type: data.status === 'accepted' || data.status === 'completed' ? 'success' : 'warning',
        title: 'הזמנה ' + label,
      });
    },
    isSignedIn,
  );
}

export default function AppRoot() {
  const { isDesktop } = useBreakpoint();
  useGlobalSocket();

  return (
    <GestureHandlerRootView style={[styles.root, isDesktop && styles.desktopBg]}>
      {isDesktop ? (
        <View style={styles.desktopFrame}>
          {/* Offset content area so fixed sidebar doesn't cover it */}
          <View style={{ flex: 1, paddingEnd: SIDEBAR_WIDTH }}>
            <RootNavigator />
          </View>
        </View>
      ) : (
        <RootNavigator />
      )}
      <NotificationBanner />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  desktopBg: { backgroundColor: '#DDE1EA' },
  desktopFrame: {
    flex: 1,
    maxWidth: 1440,
    width: '100%' as any,
    alignSelf: 'center',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    overflow: Platform.OS === 'web' ? ('hidden' as any) : 'visible',
  },
});
