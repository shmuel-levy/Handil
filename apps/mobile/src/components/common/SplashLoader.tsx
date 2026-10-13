import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { monoFont, radius } from '../../constants/theme';
import BlueprintGrid from '../site/BlueprintGrid';
import HazardStripe from '../site/HazardStripe';

/** Indeterminate "loading" bar that sweeps like a level bubble. */
function SiteProgress() {
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const thumb = 56;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, trackWidth - thumb)] });

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.thumb, { width: thumb, transform: [{ translateX }] }]} />
    </View>
  );
}

export default function SplashLoader() {
  const swing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // A hammer tapping a nail: quick strike, slower lift
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(swing, { toValue: 0, duration: 380, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.delay(420),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [swing]);

  const rotate = swing.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '6deg'] });

  return (
    <View style={styles.container} accessibilityLabel="טוען את הנדיל" accessibilityRole="progressbar">
      <BlueprintGrid />
      <HazardStripe height={14} stripe={16} style={styles.topTape} />

      <View style={styles.center}>
        <View style={styles.badge}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="hammer" size={50} color={colors.asphalt} />
          </Animated.View>
        </View>

        <Text style={styles.brand}>הנדיל</Text>
        <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים</Text>

        <SiteProgress />
        <Text style={styles.status}>מכינים את אתר העבודה…</Text>
      </View>

      <HazardStripe height={14} stripe={16} style={styles.bottomTape} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.asphalt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTape: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomTape: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  center: { alignItems: 'center', width: 240 },

  badge: {
    width: 104, height: 104, borderRadius: radius.lg,
    backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 26,
    borderBottomWidth: 5, borderBottomColor: colors.hazardDark,
  },

  brand: {
    fontSize: 44, fontWeight: '900', color: colors.onAsphalt,
    letterSpacing: -1, marginBottom: 6,
  },
  tagline: {
    fontSize: 15, color: colors.onAsphaltMuted,
    textAlign: 'center',
    marginBottom: 40,
  },

  track: {
    width: '100%', height: 8, borderRadius: radius.sm,
    backgroundColor: colors.asphaltSoft,
    borderWidth: 1, borderColor: colors.asphaltLine,
    overflow: 'hidden',
  },
  thumb: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
  status: {
    marginTop: 12, fontSize: 11, color: colors.onAsphaltMuted,
    fontFamily: monoFont, letterSpacing: 0.5,
  },
});
