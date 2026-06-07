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
import { register } from '../../services/authApi';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

type Role = 'resident' | 'worker';

const ROLES: { value: Role; title: string; subtitle: string; icon: string }[] = [
  { value: 'resident', title: 'דייר', subtitle: 'אני מחפש בעל מקצוע', icon: 'home-outline' },
  { value: 'worker', title: 'בעל מקצוע', subtitle: 'אני מציע שירותים', icon: 'construct-outline' },
];

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { isDesktop } = useBreakpoint();

  async function handleRegister() {
    setError('');
    if (!role) { setError('נא לבחור סוג חשבון'); return; }
    if (!name.trim()) { setError('נא להזין שם מלא'); return; }
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (password.length < 6) { setError('הסיסמה חייבת להיות לפחות 6 תווים'); return; }

    setLoading(true);
    try {
      const { token, user } = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role,
      });
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.container, isDesktop && styles.containerDesktop]} keyboardShouldPersistTaps="handled">
        <View style={isDesktop ? styles.desktopInner : undefined}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>יצירת חשבון</Text>
        <Text style={styles.subtitle}>הצטרפו לקהילת Handil</Text>

        {/* Role selection */}
        <Text style={styles.sectionLabel}>אני...</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={r.icon as any}
                size={28}
                color={role === r.value ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.roleTitle, role === r.value && styles.roleTitleActive]}>
                {r.title}
              </Text>
              <Text style={styles.roleSubtitle}>{r.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <Input label="שם מלא" placeholder="ישראל ישראלי" value={name} onChangeText={setName} autoComplete="name" />
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
            label="טלפון (אופציונלי)"
            placeholder="05X-XXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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
            title="הרשמה"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              כבר יש לך חשבון?{' '}
              <Text style={styles.linkBold}>כניסה</Text>
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  containerDesktop: { alignItems: 'center', paddingHorizontal: 0, paddingTop: 60 },
  desktopInner: { width: 500, paddingBottom: 40 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-end' },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'right', marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleTitle: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, marginTop: 8 },
  roleTitleActive: { color: colors.primary },
  roleSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  form: {},
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
