import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import BlueprintGrid from '../site/BlueprintGrid';
import HazardStripe from '../site/HazardStripe';

const SIDEBAR_WIDTH = 256;

const ROUTE_META: Record<string, { icon: string; activeIcon: string; label: string }> = {
  HomeTab:     { icon: 'home-outline',          activeIcon: 'home',           label: 'בית' },
  SearchTab:   { icon: 'search-outline',        activeIcon: 'search',         label: 'חיפוש' },
  PostsTab:    { icon: 'clipboard-outline',     activeIcon: 'clipboard',      label: 'עבודות' },
  BookingsTab: { icon: 'calendar-outline',      activeIcon: 'calendar',       label: 'הזמנות' },
  ChatTab:     { icon: 'chatbubbles-outline',   activeIcon: 'chatbubbles',    label: 'הודעות' },
  ProfileTab:  { icon: 'person-outline',        activeIcon: 'person',         label: 'פרופיל' },
};

export { SIDEBAR_WIDTH };

export default function WebSidebar({ state, navigation }: BottomTabBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    // position: 'fixed' is a CSS prop that React Native Web passes through
    <View style={styles.sidebar as any}>
      <BlueprintGrid cell={22} />
      <HazardStripe height={6} stripe={9} />

      {/* Branding */}
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Ionicons name="construct" size={22} color={colors.asphalt} />
        </View>
        <View>
          <Text style={styles.logoName}>הנדיל</Text>
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
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
            >
              <Ionicons
                name={(focused ? meta.activeIcon : meta.icon) as any}
                size={19}
                color={focused ? colors.asphalt : colors.onAsphaltMuted}
              />
              <Text style={[styles.navLabel, focused && styles.navLabelActive]}>
                {meta.label}
              </Text>
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
          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="התנתקות"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.onAsphaltMuted} />
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
    backgroundColor: colors.asphalt,
    paddingBottom: 20,
    zIndex: 1000,
    overflow: 'hidden',
  } as any,
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 22,
    marginBottom: 24,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.hazard,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: colors.hazardDark,
  },
  logoName: { fontSize: 20, fontWeight: '900', color: colors.onAsphalt },
  logoSub: { fontSize: 11, color: colors.onAsphaltMuted, marginTop: 1 },
  nav: { flex: 1, paddingHorizontal: 14 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: colors.hazard,
    borderBottomWidth: 3,
    borderBottomColor: colors.hazardDark,
  },
  navLabel: { fontSize: 14, fontWeight: '600', color: colors.onAsphaltMuted, flex: 1, textAlign: 'right' },
  navLabelActive: { color: colors.asphalt, fontWeight: '900' },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    paddingHorizontal: 8,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.asphaltLine,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.asphaltSoft,
    borderWidth: 1,
    borderColor: colors.asphaltLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 16, fontWeight: '800', color: colors.hazard },
  userName: { fontSize: 13, fontWeight: '700', color: colors.onAsphalt },
  userRole: { fontSize: 11, color: colors.onAsphaltMuted, marginTop: 1 },
  logoutBtn: { padding: 8 },
});
