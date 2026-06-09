import React from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SIDEBAR_WIDTH } from '../components/layout/WebSidebar';
import RootNavigator from '../navigation/RootNavigator';
import { colors } from '../constants/colors';

// Force RTL layout for Hebrew — applies on the next JS reload in Expo Go
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// Web: set document direction so all CSS layout flips to RTL
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}

export default function AppRoot() {
  const { isDesktop } = useBreakpoint();

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
