import React, { useEffect } from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NotificationBanner from '../components/common/NotificationBanner';
import { SIDEBAR_WIDTH } from '../components/layout/WebSidebar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import RootNavigator from '../navigation/RootNavigator';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketClient';
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

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    let mounted = true;

    connectSocket().then((socket) => {
      if (!mounted) return;

      socket.off('new_quote');
      socket.off('quote_accepted');
      socket.off('quote_rejected');
      socket.off('new_post');
      socket.off('booking_updated');

      socket.on('new_quote', (data: { postTitle: string; quote: { workerName: string; proposedPrice: number } }) => {
        addNote({
          type: 'info',
          title: 'הצעה חדשה התקבלה',
          subtitle: `${data.quote.workerName} הציע ₪${data.quote.proposedPrice?.toLocaleString('he-IL')}`,
        });
      });

      socket.on('quote_accepted', (data: { postTitle: string; price: number }) => {
        addNote({
          type: 'success',
          title: 'הצעתך התקבלה! 🎉',
          subtitle: data.postTitle ?? undefined,
        });
      });

      socket.on('quote_rejected', (data: { postTitle: string }) => {
        addNote({
          type: 'warning',
          title: 'הצעתך נדחתה',
          subtitle: data.postTitle ?? undefined,
        });
      });

      socket.on('new_post', (data: { post: { title: string; category: string } }) => {
        if (user.role !== 'worker') return;
        addNote({
          type: 'info',
          title: 'עבודה חדשה פורסמה',
          subtitle: data.post?.title ?? undefined,
        });
      });

      socket.on('booking_updated', (data: { status: string }) => {
        const STATUS_HE: Record<string, string> = {
          accepted:  'אושרה',
          rejected:  'נדחתה',
          completed: 'הושלמה',
          cancelled: 'בוטלה',
        };
        const label = STATUS_HE[data.status];
        if (label) {
          addNote({
            type: data.status === 'accepted' || data.status === 'completed' ? 'success' : 'warning',
            title: `הזמנה ${label}`,
          });
        }
      });
    }).catch(() => {});

    return () => {
      mounted = false;
      const s = getSocket();
      if (s) {
        s.off('new_quote');
        s.off('quote_accepted');
        s.off('quote_rejected');
        s.off('new_post');
        s.off('booking_updated');
      }
    };
  }, [user?.id]);
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
