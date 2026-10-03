import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlueprintGrid from '../../components/site/BlueprintGrid';
import HazardStripe from '../../components/site/HazardStripe';
import { colors } from '../../constants/colors';
import { leadingEdge, plateEdge, radius } from '../../constants/theme';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLoginForm } from '../../hooks/useLoginForm';
import { AuthStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

const { height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, error, loading, submit: handleLogin } = useLoginForm();
  const [showPass, setShowPass] = useState(false);
  const { isDesktop } = useBreakpoint();

  // Animation refs
  const logoScale  = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const brandY     = useRef(new Animated.Value(24)).current;
  const brandOp    = useRef(new Animated.Value(0)).current;
  const cardY      = useRef(new Animated.Value(90)).current;
  const cardOp     = useRef(new Animated.Value(0)).current;
  const circle1    = useRef(new Animated.Value(0)).current;
  const circle2    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(circle1, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(circle2, { toValue: 1, duration: 800, delay: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(brandY, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(brandOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (isDesktop) {
    return <DesktopLogin navigation={navigation} />;
  }

  return (
    <View style={styles.root}>
      {/* ── Orange hero section ── */}
      <View style={styles.hero}>
        {/* Drafting grid fades in like plans being unrolled */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: circle1 }]}>
          <BlueprintGrid />
        </Animated.View>

        <SafeAreaView edges={['top']} style={styles.heroInner}>
          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <View style={styles.logoCircle}>
              <Ionicons name="hammer" size={38} color={colors.asphalt} />
            </View>
          </Animated.View>

          {/* Brand */}
          <Animated.View style={{ transform: [{ translateY: brandY }], opacity: brandOp, alignItems: 'center' }}>
            <Text style={styles.brandName}>הנדיל</Text>
            <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים{'\n'}בכל רחבי ישראל</Text>
          </Animated.View>
        </SafeAreaView>
        <HazardStripe height={10} stripe={14} />
      </View>

      {/* ── Form card slides up ── */}
      <Animated.View style={[styles.cardWrap, { transform: [{ translateY: cardY }], opacity: cardOp }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.cardScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.cardTitle}>כניסה לאתר</Text>
            <Text style={styles.cardSub}>הזן את הפרטים שלך להתחברות</Text>

            {/* Email */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="אימייל"
                placeholderTextColor={colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textAlign="right"
              />
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="סיסמה"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showPass}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.inputIcon}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.loginBtnText}>מתחבר…</Text>
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color={colors.white} />
                  <Text style={styles.loginBtnText}>כניסה</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>חדש בהנדיל?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnText}>הירשם עכשיו — זה בחינם</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// ── Desktop fallback (clean centered card) ──────────────────────────────────

function DesktopLogin({ navigation }: Props) {
  // Same behaviour as the mobile layout, only the presentation differs
  const { email, setEmail, password, setPassword, error, loading, submit: handleLogin } = useLoginForm();

  return (
    <View style={styles.desktopRoot}>
      {/* Asphalt panel with drafting grid */}
      <View style={styles.desktopPanel}>
        <BlueprintGrid cell={28} />
        <HazardStripe height={10} stripe={14} style={styles.desktopTape} />
        <View style={styles.desktopPanelInner}>
          <View style={styles.desktopLogoCircle}>
            <Ionicons name="hammer" size={44} color={colors.asphalt} />
          </View>
          <Text style={styles.desktopBrandName}>הנדיל</Text>
          <Text style={styles.desktopTagline}>מחברים בעלי מקצוע{'\n'}עם דיירים בישראל</Text>
          <View style={styles.desktopBullets}>
            {['דירוגים אמיתיים מלקוחות', 'מחירים שקופים מראש', 'מצא מקצוען בקרבתך'].map((b) => (
              <View key={b} style={styles.desktopBulletRow}>
                <Ionicons name="checkbox" size={16} color={colors.hazard} />
                <Text style={styles.desktopBulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Right form */}
      <View style={styles.desktopForm}>
        <View style={styles.desktopFormInner}>
          <Text style={styles.desktopFormTitle}>ברוך הבא חזרה</Text>
          <Text style={styles.desktopFormSub}>הכנס את הפרטים שלך</Text>

          <View style={[styles.inputWrap, { marginTop: 28 }]}>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="אימייל" placeholderTextColor={colors.textDisabled} keyboardType="email-address" autoCapitalize="none" textAlign="right" />
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          </View>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="סיסמה" placeholderTextColor={colors.textDisabled} secureTextEntry textAlign="right" />
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled, { marginTop: 24 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>{loading ? 'מתחבר…' : 'כניסה'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              אין לך חשבון?{'  '}<Text style={{ color: colors.primary, fontWeight: '700' }}>הירשם עכשיו</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.asphalt },

  // ── Hero
  hero: {
    height: SCREEN_H * 0.40,
    backgroundColor: colors.asphalt,
    overflow: 'hidden',
    position: 'relative',
  },
  heroInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 8,
  },
  logoWrap: { marginBottom: 16 },
  logoCircle: {
    width: 84, height: 84, borderRadius: radius.lg,
    backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
    ...plateEdge(colors.hazardDark, 5),
  },
  brandName: {
    fontSize: 40, fontWeight: '900', color: colors.onAsphalt,
    letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: {
    fontSize: 14, color: colors.onAsphaltMuted,
    textAlign: 'center', lineHeight: 22,
  },

  // ── Form card
  cardWrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cardScroll: {
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 26, fontWeight: '900', color: colors.textPrimary,
    textAlign: 'right', marginBottom: 6,
  },
  cardSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'right', marginBottom: 26, lineHeight: 22,
  },

  // ── Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
  },
  inputIcon: { padding: 2 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // ── Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12, borderRadius: radius.md, marginBottom: 16,
    borderWidth: 1, borderColor: colors.error + '40',
    ...leadingEdge(colors.error, 4),
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right' },

  // ── Login button
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 15, borderRadius: radius.md,
    ...plateEdge(colors.primaryDark, 4),
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: colors.white, fontSize: 17, fontWeight: '900' },

  // ── Divider
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 28, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted },

  // ── Register button
  registerBtn: {
    borderWidth: 2, borderColor: colors.asphalt,
    paddingVertical: 13, borderRadius: radius.md, alignItems: 'center',
    backgroundColor: colors.surface,
    ...plateEdge(colors.asphalt, 4),
  },
  registerBtnText: { fontSize: 15, fontWeight: '900', color: colors.asphalt },

  // ── Desktop
  desktopRoot: { flex: 1, flexDirection: 'row' },
  desktopPanel: {
    flex: 1,
    backgroundColor: colors.asphalt,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  desktopTape: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  desktopPanelInner: { alignItems: 'center', paddingHorizontal: 48 },
  desktopLogoCircle: {
    width: 100, height: 100, borderRadius: radius.lg,
    backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    ...plateEdge(colors.hazardDark, 6),
  },
  desktopBrandName: { fontSize: 52, fontWeight: '900', color: colors.onAsphalt, marginBottom: 12 },
  desktopTagline: {
    fontSize: 18, color: colors.onAsphaltMuted,
    textAlign: 'center', lineHeight: 28, marginBottom: 40,
  },
  desktopBullets: { gap: 14 },
  desktopBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  desktopBulletText: { fontSize: 15, color: colors.onAsphalt, fontWeight: '600' },
  desktopForm: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  desktopFormInner: { width: 420 },
  desktopFormTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  desktopFormSub: { fontSize: 15, color: colors.textMuted, textAlign: 'right' },
});
