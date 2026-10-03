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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BlueprintGrid from '../../components/site/BlueprintGrid';
import HazardStripe from '../../components/site/HazardStripe';
import { colors } from '../../constants/colors';
import { leadingEdge, plateEdge, radius } from '../../constants/theme';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AuthStackParamList } from '../../navigation/types';
import { register } from '../../services/authApi';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };
type Role = 'resident' | 'worker';

const ROLES: { value: Role; title: string; subtitle: string; icon: string }[] = [
  { value: 'resident', title: 'דייר',      subtitle: 'אני מחפש בעל מקצוע', icon: 'home-outline' },
  { value: 'worker',   title: 'בעל מקצוע', subtitle: 'אני מציע שירותים',   icon: 'construct-outline' },
];

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole]         = useState<Role | null>(null);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { isDesktop }           = useBreakpoint();
  // The dark header used to start under the status bar / notch
  const insets                  = useSafeAreaInsets();

  async function handleRegister() {
    setError('');
    if (!role)            { setError('נא לבחור סוג חשבון'); return; }
    if (!name.trim())     { setError('נא להזין שם מלא'); return; }
    if (!email.trim())    { setError('נא להזין אימייל'); return; }
    if (password.length < 6) { setError('הסיסמה חייבת להיות לפחות 6 תווים'); return; }

    setLoading(true);
    try {
      const { token, user } = await register({
        name: name.trim(), email: email.trim(),
        password, phone: phone.trim() || undefined, role,
      });
      navigation.navigate('Onboarding', { token, user });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'שגיאת חיבור');
      else setError('אירעה שגיאה, נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  function renderRoles() {
    return (
      <View style={styles.roleSection}>
        <Text style={styles.sectionLabel}>אני רוצה...</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === r.value }}
              accessibilityLabel={r.title}
            >
              <View style={[styles.roleIconWrap, role === r.value && styles.roleIconWrapActive]}>
                <Ionicons
                  name={r.icon as any}
                  size={26}
                  color={role === r.value ? colors.asphalt : colors.steel}
                />
              </View>
              <Text style={[styles.roleTitle, role === r.value && styles.roleTitleActive]}>
                {r.title}
              </Text>
              <Text style={styles.roleSubtitle}>{r.subtitle}</Text>
              {role === r.value && (
                <View style={styles.roleCheck}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderFields() {
    return (
      <>
        {renderRoles()}

        <View style={styles.fields}>
          <Input label="שם מלא"          placeholder="ישראל ישראלי"   value={name}     onChangeText={setName}     autoComplete="name" />
          <Input label="אימייל"           placeholder="your@email.com" value={email}    onChangeText={setEmail}    keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Input label="טלפון (אופציונלי)" placeholder="05X-XXXXXXX"   value={phone}    onChangeText={setPhone}    keyboardType="phone-pad" />
          <Input label="סיסמה"            placeholder="לפחות 6 תווים"  value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button title="הרשמה והמשך" onPress={handleRegister} loading={loading} size="lg" style={styles.submitBtn} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
          <Text style={styles.loginText}>
            כבר יש לך חשבון?{' '}
            <Text style={styles.loginLink}>כניסה</Text>
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.containerDesktop} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.desktopInner}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>יצירת חשבון</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>הצטרפו לקהילת הנדיל — בחינם לחלוטין</Text>
            {renderFields()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.asphalt }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Dark header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <BlueprintGrid />
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
          >
            <Ionicons name="arrow-forward" size={22} color={colors.hazard} />
          </TouchableOpacity>

          <View style={styles.headerLogoWrap}>
            <View style={styles.headerLogo}>
              <Ionicons name="hammer" size={26} color={colors.asphalt} />
            </View>
          </View>

          <Text style={styles.title}>יצירת חשבון</Text>
          <Text style={styles.subtitle}>הצטרפו לקהילת הנדיל — בחינם לחלוטין</Text>
        </View>
        <HazardStripe height={10} stripe={14} />

        {/* White form card */}
        <View style={styles.body}>
          {renderFields()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  // Mobile scroll
  scrollContent: { flexGrow: 1 },

  // Dark header
  header: {
    backgroundColor: colors.asphalt,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  headerBackBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.asphaltSoft,
    borderWidth: 1, borderColor: colors.asphaltLine,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 20,
  },
  headerLogoWrap: { alignItems: 'flex-end', marginBottom: 16 },
  headerLogo: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
    ...plateEdge(colors.hazardDark, 4),
  },

  // White body
  body: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    flex: 1,
  },

  // Desktop
  containerDesktop: { alignItems: 'center', paddingHorizontal: 0, paddingVertical: 24 },
  desktopInner: { width: 520 },
  backBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 24,
  },

  title: {
    fontSize: 28, fontWeight: '900', color: colors.onAsphalt,
    textAlign: 'right', marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: colors.onAsphaltMuted,
    textAlign: 'right', lineHeight: 22,
  },

  // Role selection
  roleSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: colors.textSecondary,
    textAlign: 'right', marginBottom: 12,
  },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: colors.border,
    ...plateEdge(colors.border, 4),
    position: 'relative',
  },
  roleCardActive: {
    borderColor: colors.asphalt, backgroundColor: colors.hazardLight,
    ...plateEdge(colors.asphalt, 4),
  },
  roleIconWrap: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  roleIconWrapActive: { backgroundColor: colors.hazard },
  roleTitle: {
    fontSize: 16, fontWeight: '800', color: colors.textSecondary, marginBottom: 4,
  },
  roleTitleActive: { color: colors.asphalt },
  roleSubtitle: {
    fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18,
  },
  roleCheck: {
    position: 'absolute', top: 10, left: 10,
    width: 22, height: 22, borderRadius: radius.sm,
    backgroundColor: colors.asphalt, alignItems: 'center', justifyContent: 'center',
  },

  // Fields
  fields: { gap: 4, marginBottom: 8 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight,
    padding: 13, borderRadius: radius.md, marginBottom: 12,
    ...leadingEdge(colors.error, 4),
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right' },

  submitBtn: { marginTop: 12, marginBottom: 20 },

  loginRow: { alignItems: 'center', paddingBottom: 20 },
  loginText: { fontSize: 14, color: colors.textMuted },
  loginLink: { color: colors.primary, fontWeight: '800' },
});
