import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

interface Props {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
}

export default function StarRating({ rating, reviewCount, size = 14, showCount = true }: Props) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.row}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Ionicons key={`f${i}`} name="star" size={size} color={colors.star} />
      ))}
      {hasHalf && <Ionicons name="star-half" size={size} color={colors.star} />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={size} color={colors.star} />
      ))}
      {showCount && (
        <Text style={[styles.text, { fontSize: size }]}>
          {' '}
          {rating.toFixed(1)}
          {reviewCount !== undefined ? ` (${reviewCount})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { color: colors.textMuted, marginStart: 2 },
});
