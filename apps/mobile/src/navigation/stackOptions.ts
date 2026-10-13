import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors } from '../constants/colors';

/**
 * Shared header look for every stack: an asphalt bar with a safety-yellow
 * back arrow. Each stack used to declare its own (slightly different) white
 * header, so moving between tabs changed the chrome.
 */
export const siteHeader: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.asphalt },
  headerTintColor: colors.hazard,
  headerTitleStyle: { fontWeight: '800', color: colors.onAsphalt },
  headerShadowVisible: false,
  headerBackTitle: '',
  contentStyle: { backgroundColor: colors.background },
};
