import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
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
import { colors } from '../../constants/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AuthStackParamList } from '../../navigation/types';
import { login } from '../../services/authApi';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

const { height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
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

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setAuth(token, user);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'שגיאת חיבור — בדוק אימייל וסיסמה');
      } else {
        setError('אירעה שגיאה, נסה שוב');
      }
    } finally {
      setLoading(false);
    }
  }

  if (isDesktop) {
    return <DesktopLogin navigation={navigation} />;
  }

  return (
    <View style={styles.root}>
      {/* ── Orange hero section ── */}
      <View style={styles.hero}>
        {/* Decorative animated circles */}
        <Animated.View style={[styles.circleA, { opacity: circle1, transform: [{ scale: circle1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} />
        <Animated.View style={[styles.circleB, { opacity: circle2, transform: [{ scale: circle2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} />
        <Animated.View style={[styles.circleC, { opacity: circle1 }]} />

        <SafeAreaView edges={['top']} style={styles.heroInner}>
          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <View style={styles.logoCircle}>
              <Ionicons name="hammer" size={38} color={colors.white} />
            </View>
          </Animated.View>

          {/* Brand */}
          <Animated.View style={{ transform: [{ translateY: brandY }], opacity: brandOp, alignItems: 'center' }}>
            <Text style={styles.brandName}>הנדיל</Text>
            <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים{'\n'}בכל רחבי ישראל</Text>
          </Animated.View>
        </SafeAreaView>
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
            <Text style={styles.cardTitle}>ברוך הבא 👋</Text>
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) { setError('נא למלא אימייל וסיסמה'); return; }
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setAuth(token, user);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'שגיאת חיבור');
      else setError('אירעה שגיאה');
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.desktopRoot}>
      {/* Left orange panel */}
      <View style={styles.desktopPanel}>
        <View style={styles.desktopPanelInner}>
          <View style={styles.desktopLogoCircle}>
            <Ionicons name="hammer" size={44} color={colors.white} />
          </View>
          <Text style={styles.desktopBrandName}>הנדיל</Text>
          <Text style={styles.desktopTagline}>מחברים בעלי מקצוע{'\n'}עם דיירים בישראל</Text>
          <View style={styles.desktopBullets}>
            {['דירוגים אמיתיים מלקוחות', 'מחירים שקופים מראש', 'מצא מקצוען בקרבתך'].map((b) => (
              <View key={b} style={styles.desktopBulletRow}>
                <View style={styles.desktopBulletDot} />
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
  root: { flex: 1, backgroundColor: '#0F172A' },

  // ── Hero
  hero: {
    height: SCREEN_H * 0.40,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
  },
  heroInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 8,
  },
  // Decorative circles
  circleA: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(249,115,22,0.12)',
    top: -90, right: -70,
  },
  circleB: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.08)',
    bottom: -50, left: -40,
  },
  circleC: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(249,115,22,0.15)',
    top: 20, left: 30,
  },
  logoWrap: { marginBottom: 16 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: colors.primary,
    borderWidth: 2, borderColor: 'rgba(249,115,22,0.5)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  brandName: {
    fontSize: 38, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, marginBottom: 8,
  },
  tagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.78)',
    textAlign: 'center', lineHeight: 22,
  },

  // ── Form card
  cardWrap: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  cardScroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 26, fontWeight: '900', color: colors.textPrimary,
    textAlign: 'right', marginBottom: 6,
  },
  cardSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'right', marginBottom: 28, lineHeight: 22,
  },

  // ── Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
  },
  inputIcon: { padding: 2 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // ── Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.error + '30',
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right' },

  // ── Login button
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 17, borderRadius: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },

  // ── Divider
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 28, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted },

  // ── Register button
  registerBtn: {
    borderWidth: 2, borderColor: colors.primary + '60',
    paddingVertical: 15, borderRadius: 18, alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  // ── Desktop
  desktopRoot: { flex: 1, flexDirection: 'row' },
  desktopPanel: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
  },
  desktopPanelInner: { alignItems: 'center', paddingHorizontal: 48 },
  desktopLogoCircle: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2, borderColor: 'rgba(249,115,22,0.5)',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  desktopBrandName: { fontSize: 48, fontWeight: '900', color: '#fff', marginBottom: 12 },
  desktopTagline: {
    fontSize: 18, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', lineHeight: 28, marginBottom: 40,
  },
  desktopBullets: { gap: 12 },
  desktopBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  desktopBulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  desktopBulletText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  desktopForm: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  desktopFormInner: { width: 420 },
  desktopFormTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  desktopFormSub: { fontSize: 15, color: colors.textMuted, textAlign: 'right' },
});
