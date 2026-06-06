import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Force RTL for Hebrew-first layout (requires app reload to take effect after first install)
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

registerRootComponent(App);
