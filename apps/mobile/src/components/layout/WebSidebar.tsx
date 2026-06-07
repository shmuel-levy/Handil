import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const SIDEBAR_WIDTH = 256;

const ROUTE_META: Record<string, { icon: string; activeIcon: string; label: string }> = {
  HomeTab:     { icon: 'home-outline',      activeIcon: 'home',      label: 'בית' },
  SearchTab:   { icon: 'search-outline',    activeIcon: 'search',    label: 'חיפוש' },
  PostsTab:    { icon: 'newspaper-outline', activeIcon: 'newspaper', label: 'עבודות' },
  BookingsTab: { icon: 'calendar-outline',  activeIcon: 'calendar',  label: 'הזמנות' },
  ProfileTab:  { icon: 'person-outline',    activeIcon: 'person',    label: 'פרופיל' },
};

export { SIDEBAR_WIDTH };

export default function WebSidebar({ state, navigation }: BottomTabBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    // position: 'fixed' is a CSS prop that React Native Web passes through
    <View style={styles.sidebar as any}>
      {/* Branding */}
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>H</Text>
        </View>
        <View>
          <Text style={styles.logoName}>Handil</Text>
          <Text style={styles.logoSub}>שוק בעלי מקצוע</Text>
        </View>
      </View>

      {/* Nav items */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {state.routes.map((route, index) => {
          const meta = ROUTE_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.navItem, focused && styles.navItemActive]}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={(focused ? meta.activeIcon : meta.icon) as any}
                  size={18}
                  color={focused ? colors.white : colors.textMuted}
                />
              </View>
              <Text style={[styles.navLabel, focused && styles.navLabelActive]}>
                {meta.label}
              </Text>
              {focused && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User footer */}
      {user && (
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.userRole}>{user.role === 'worker' ? 'בעל מקצוע' : 'לקוח'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    // Fixed overlay on the right edge — React Native Web passes unknown CSS props through
    position: 'fixed' as any,
    top: 0,
    bottom: 0,
    end: 0,              // logical: right in LTR, left in RTL — but for desktop sidebar we always want right
    right: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderColor: colors.border,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 14,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  } as any,
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoMarkText: { fontSize: 22, fontWeight: '900', color: colors.white },
  logoName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  logoSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  nav: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 3,
    position: 'relative',
  },
  navItemActive: { backgroundColor: colors.primaryLight },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primary },
  navLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted, flex: 1, textAlign: 'right' },
  navLabelActive: { color: colors.primary, fontWeight: '700' },
  activeIndicator: {
    position: 'absolute',
    end: 0,
    top: '25%' as any,
    bottom: '25%' as any,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  userName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  userRole: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  logoutBtn: { padding: 6 },
});
