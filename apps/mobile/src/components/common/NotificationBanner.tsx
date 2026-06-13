import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { AppNotification, useNotificationStore } from '../../store/notificationStore';

const TYPE_CONFIG = {
  success: { bg: colors.success,  icon: 'checkmark-circle' as const,  tint: '#fff' },
  info:    { bg: colors.primary,  icon: 'information-circle' as const, tint: '#fff' },
  warning: { bg: colors.warning,  icon: 'warning' as const,            tint: '#fff' },
  error:   { bg: colors.error,    icon: 'close-circle' as const,       tint: '#fff' },
};

const AUTO_DISMISS_MS = 4000;

function BannerItem({ notification }: { notification: AppNotification }) {
  const remove = useNotificationStore((s) => s.remove);
  const cfg    = TYPE_CONFIG[notification.type];
  const anim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }).start();
    const t = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
      remove(notification.id)
    );
  }

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });

  return (
    <Animated.View style={[styles.banner, { backgroundColor: cfg.bg }, { transform: [{ translateY }], opacity }]}>
      <View style={styles.inner}>
        <Ionicons name={cfg.icon} size={22} color={cfg.tint} />
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          {notification.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{notification.subtitle}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={cfg.tint} style={{ opacity: 0.8 }} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function NotificationBanner() {
  const insets       = useSafeAreaInsets();
  const notifications = useNotificationStore((s) => s.notifications);

  if (notifications.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {notifications.slice(0, 3).map((n) => (
        <BannerItem key={n.id} notification={n} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  banner: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textWrap: { flex: 1 },
  title:    { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'right' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'right' },
});
