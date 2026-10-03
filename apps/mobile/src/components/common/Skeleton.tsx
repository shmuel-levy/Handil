import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/theme';

/**
 * Shimmering placeholder blocks.
 *
 * Every list used to show a bare spinner, which gives no sense of what is
 * loading or how much. A skeleton in the shape of the real content makes the
 * wait feel shorter and stops the layout jumping when data lands.
 */

function useShimmer() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
}

export function SkeletonBlock({
  width, height = 12, style, round = false,
}: {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  round?: boolean;
}) {
  const opacity = useShimmer();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { height, borderRadius: round ? height / 2 : radius.sm, opacity },
        width !== undefined ? ({ width } as ViewStyle) : null,
        style,
      ]}
    />
  );
}

/** Matches the shape of WorkerCard. */
export function WorkerCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={52} height={52} round style={{ marginEnd: spacing.md }} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="35%" height={11} />
        <SkeletonBlock width="70%" height={11} />
      </View>
    </View>
  );
}

/** Matches the shape of the job feed PostCard. */
export function PostCardSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.postTop}>
        <SkeletonBlock width={90} height={22} />
        <SkeletonBlock width={60} height={20} />
      </View>
      <SkeletonBlock width="80%" height={16} style={{ marginBottom: spacing.sm }} />
      <SkeletonBlock width="95%" height={12} style={{ marginBottom: spacing.xs }} />
      <SkeletonBlock width="60%" height={12} style={{ marginBottom: spacing.lg }} />
      <View style={styles.postBottom}>
        <SkeletonBlock width={28} height={28} round />
        <SkeletonBlock width="40%" height={12} />
      </View>
    </View>
  );
}

/** Repeats a skeleton so a loading list looks like a list. */
export function SkeletonList({
  count = 4, variant = 'worker',
}: {
  count?: number;
  variant?: 'worker' | 'post';
}) {
  const Item = variant === 'post' ? PostCardSkeleton : WorkerCardSkeleton;
  return (
    <View
      accessibilityLabel="טוען תוכן"
      accessibilityRole="progressbar"
      style={styles.list}
    >
      {Array.from({ length: count }).map((_, i) => <Item key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  postBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
