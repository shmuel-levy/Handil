import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

function BounceDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -7, duration: 280, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(y, { toValue: 0,  duration: 280, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.delay(Math.max(0, 700 - delay)),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { transform: [{ translateY: y }] }]} />;
}

export default function SplashLoader() {
  const pulse  = useRef(new Animated.Value(1)).current;
  const swing  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue:  1, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(swing, { toValue: -1, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(swing, { toValue:  0, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  const rotate = swing.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-20deg', '0deg', '20deg'] });

  return (
    <View style={styles.container}>
      {/* Decorative background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Animated hammer icon */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }, { rotate }] }]}>
        <Ionicons name="hammer" size={54} color={colors.white} />
      </Animated.View>

      <Text style={styles.brand}>Handil</Text>
      <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים</Text>

      {/* Bouncing dots */}
      <View style={styles.dotsRow}>
        <BounceDot delay={0} />
        <BounceDot delay={160} />
        <BounceDot delay={320} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Decorative blobs
  blob1: {
    position: 'absolute', top: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blob2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Icon
  iconWrap: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },

  brand: {
    fontSize: 38, fontWeight: '900', color: colors.white,
    letterSpacing: -1, marginBottom: 8,
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 48,
  },

  // Dots
  dotsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
