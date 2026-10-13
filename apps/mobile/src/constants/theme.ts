import { Platform } from 'react-native';
import { colors } from './colors';

/**
 * Design tokens.
 *
 * Font sizes were previously picked ad hoc per screen (11, 12, 13, 14, 15, 16,
 * 18, 21, 24, 26, 38) and radii ranged from 6 to 30, so nothing lined up
 * between screens. New UI should use these scales.
 */

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Tight, machined corners — construction gear is boxy, not bubbly. */
export const radius = {
  sm:   4,
  md:   6,
  lg:   8,
  xl:   12,
  pill: 999,
} as const;

/** Monospace for work-order numbers, prices and measurements. */
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

/**
 * Thick accent on the reading-start edge (the right, in Hebrew).
 *
 * Native forces RTL, so `borderStart*` already means right there. React
 * Native Web resolves `borderStart*` as if the page were LTR even though the
 * document is `dir="rtl"`, which put the accent on the left — so web gets an
 * explicit right border instead.
 */
export function leadingEdge(color: string, width = 5) {
  return Platform.OS === 'web'
    ? ({ borderRightWidth: width, borderRightColor: color } as const)
    : ({ borderStartWidth: width, borderStartColor: color } as const);
}

/**
 * A solid darker bottom edge instead of a soft drop shadow. It reads like a
 * stamped steel plate and renders identically on iOS, Android and web.
 */
export function plateEdge(color: string, width = 3) {
  return { borderBottomWidth: width, borderBottomColor: color } as const;
}

export const fontSize = {
  caption: 11,
  small:   12,
  body:    14,
  bodyLg:  15,
  title:   18,
  h2:      22,
  h1:      26,
  display: 34,
} as const;

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
} as const;

/** Consistent elevation. Shadow props differ per platform; these cover both. */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

/** Minimum touch target — below this, taps get missed on real devices. */
export const MIN_TOUCH_TARGET = 44;

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow };

export { colors };
