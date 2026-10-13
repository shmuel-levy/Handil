import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';

/**
 * Faint drafting-paper grid laid over a dark surface, with a heavier line
 * every few cells like a real blueprint. Purely decorative and ignored by
 * screen readers and touches.
 */
export default function BlueprintGrid({
  cell = 24,
  majorEvery = 4,
  color = colors.blueprintLine,
  majorColor = 'rgba(120, 170, 220, 0.22)',
}: {
  cell?: number;
  majorEvery?: number;
  color?: string;
  majorColor?: string;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const cols = size.w ? Math.ceil(size.w / cell) : 0;
  const rows = size.h ? Math.ceil(size.h / cell) : 0;

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: cols }).map((_, i) => (
        <View
          key={`v${i}`}
          style={[
            styles.v,
            { left: i * cell, backgroundColor: i % majorEvery === 0 ? majorColor : color },
          ]}
        />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={`h${i}`}
          style={[
            styles.h,
            { top: i * cell, backgroundColor: i % majorEvery === 0 ? majorColor : color },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  v: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  h: { position: 'absolute', left: 0, right: 0, height: 1 },
});
