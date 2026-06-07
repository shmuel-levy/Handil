import { I18nManager, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

if (Platform.OS !== 'web') {
  // Native: force RTL so the layout engine flips all flex/start/end logic
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
} else {
  // Web: React Native Web won't reload so we set the HTML dir attribute directly
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  }
}

registerRootComponent(App);
