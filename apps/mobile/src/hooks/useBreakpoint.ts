import { Platform, useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  return {
    isMobile:  !isWeb || width < 768,
    isTablet:  isWeb && width >= 768 && width < 1024,
    isDesktop: isWeb && width >= 1024,
    width,
  };
}
