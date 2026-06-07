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
import { useBreakpoint } from '../../hooks/useBreakpoint';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors } from '../../constants/colors';
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
        setError(err.response?.data?.message || 'שגיאת חיבור');
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
      >
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={styles.appName}>Handil</Text>
          <Text style={styles.tagline}>מחברים בעלי מקצוע עם דיירים בתל אביב</Text>
        </View>

        <View style={[styles.form, isDesktop && styles.formDesktop]}>
          <Text style={styles.formTitle}>כניסה לחשבון</Text>

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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title="כניסה"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              אין לך חשבון?{' '}
              <Text style={styles.linkBold}>הירשם עכשיו</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  containerDesktop: { alignItems: 'center', paddingHorizontal: 0, paddingVertical: 60 },
  header: { alignItems: 'center', marginBottom: 40 },
  headerDesktop: { width: 460 },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: colors.white },
  appName: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  formDesktop: { width: 460, borderWidth: 1, borderColor: colors.border },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 12,
    backgroundColor: colors.errorLight,
    padding: 10,
    borderRadius: 8,
  },
  submitBtn: { marginTop: 4 },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.textMuted },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
