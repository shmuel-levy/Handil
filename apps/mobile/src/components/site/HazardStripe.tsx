import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

/**
 * Yellow-and-black hazard tape.
 *
 * Built from rotated bars rather than an image or gradient so it works the
 * same on iOS, Android and web with no extra dependency. The bar count comes
 * from the measured width, so it fills any container without over-rendering.
 */
export default function HazardStripe({
  height = 8,
  stripe = 12,
  base = colors.hazard,
  band = colors.asphalt,
  style,
}: {
  height?: number;
  /** Width of each diagonal band */
  stripe?: number;
  base?: string;
  band?: string;
  style?: ViewStyle;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // A 45° bar tall enough to cross the strip diagonally
  const barLength = height * 2 + stripe * 2;
  const count = width ? Math.ceil((width + barLength) / (stripe * 2)) + 1 : 0;

  return (
    <View
      onLayout={onLayout}
      style={[styles.strip, { height, backgroundColor: base }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: (height - barLength) / 2,
            left: i * stripe * 2 - barLength / 2,
            width: stripe,
            height: barLength,
            backgroundColor: band,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { width: '100%', overflow: 'hidden' },
});
