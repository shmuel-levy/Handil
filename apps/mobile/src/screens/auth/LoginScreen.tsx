import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors } from '../../constants/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AuthStackParamList } from '../../navigation/types';
import { login } from '../../services/authApi';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { isDesktop } = useBreakpoint();

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, isDesktop && styles.containerDesktop]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo / Brand ── */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.logoContainer}>
            <Ionicons name="hammer" size={34} color={colors.white} />
          </View>
          <Text style={styles.appName}>Handil</Text>
          <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים בכל רחבי ישראל</Text>
        </View>

        {/* ── Form card ── */}
        <View style={[styles.form, isDesktop && styles.formDesktop]}>
          <Text style={styles.formTitle}>ברוך הבא בחזרה</Text>
          <Text style={styles.formSub}>הכנס את הפרטים שלך להתחברות</Text>

          <View style={styles.fields}>
            <Input
              label="אימייל"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="סיסמה"
              placeholder="לפחות 6 תווים"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title="כניסה"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>אין לך חשבון?</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.registerBtnText}>הירשם עכשיו — זה בחינם</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  containerDesktop: { alignItems: 'center', paddingHorizontal: 0 },

  // Header / Brand
  header: { alignItems: 'center', marginBottom: 36 },
  headerDesktop: { width: 460 },
  logoContainer: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 8,
  },
  appName: {
    fontSize: 34, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: -0.5, marginBottom: 8,
  },
  tagline: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 12,
  },

  // Form card
  form: {
    backgroundColor: colors.surface,
    borderRadius: 24, padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  formDesktop: { width: 460, borderWidth: 1, borderColor: colors.border },
  formTitle: {
    fontSize: 22, fontWeight: '800', color: colors.textPrimary,
    textAlign: 'right', marginBottom: 4,
  },
  formSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'right', marginBottom: 24,
  },

  fields: { gap: 4 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12, borderRadius: 12, marginTop: 8, marginBottom: 4,
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right' },

  submitBtn: { marginTop: 20 },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 24, marginBottom: 16,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // Register button
  registerBtn: {
    backgroundColor: colors.background,
    borderWidth: 2, borderColor: colors.primary,
    paddingVertical: 13, borderRadius: 14, alignItems: 'center',
  },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
