import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
type Route = RouteProp<AuthStackParamList, 'Onboarding'>;

// ── Constants ────────────────────────────────────────────────────────────────

const CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'אשדוד', 'בני ברק', 'בת ים', 'חולון',
  'רמת גן', 'גבעתיים', 'הרצליה', 'כפר סבא', 'מודיעין',
  'אשקלון', 'רחובות', 'נס ציונה', 'חדרה', 'רמת השרון',
  'לוד', 'רמלה', 'ראש העין', 'יבנה', 'עפולה',
  'נהריה', 'טבריה', 'קריות', 'באר שבע', 'אחר',
];

const EXP_OPTIONS = [
  { label: 'רק מתחיל', sub: '0–1 שנים', years: 0, icon: 'leaf-outline' as const },
  { label: 'יש לי ניסיון', sub: '1–5 שנים', years: 2, icon: 'trending-up-outline' as const },
  { label: 'ותיק', sub: '5–10 שנים', years: 7, icon: 'ribbon-outline' as const },
  { label: 'מומחה', sub: '10+ שנים', years: 12, icon: 'trophy-outline' as const },
];

const FREQ_OPTIONS = [
  { label: 'כמעט אף פעם', sub: 'פחות מפעם בשנה', value: 'rarely' },
  { label: 'לפעמים', sub: '1–3 פעמים בשנה', value: 'sometimes' },
  { label: 'לעיתים קרובות', sub: '3–6 פעמים בשנה', value: 'often' },
  { label: 'תדיר מאוד', sub: 'יותר מ-6 פעמים בשנה', value: 'frequent' },
];

const RESIDENT_STEPS = [
  { icon: 'location' as const, title: 'מאיפה אתה?', sub: 'נביא לך בעלי מקצוע מהאזור שלך' },
  { icon: 'construct' as const, title: 'מה אתה הכי צריך?', sub: 'נדע מה לחפש עבורך ראשון' },
  { icon: 'repeat' as const, title: 'כמה פעמים בשנה?', sub: 'נתאים לך את חוויית השימוש' },
];

const WORKER_STEPS = [
  { icon: 'star' as const, title: 'כמה שנות ניסיון יש לך?', sub: 'יעזור ללקוחות למצוא ולסמוך עליך' },
  { icon: 'hammer' as const, title: 'מה הם התחומים שלך?', sub: 'בחר הכל שרלוונטי — ניתן לשנות בהמשך' },
  { icon: 'person' as const, title: 'קצת עוד עלייך', sub: 'מידע שיעזור ללקוחות לבחור בך' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { token, user } = params;
  const setAuth = useAuthStore((s) => s.setAuth);

  const isWorker = user.role === 'worker';
  const STEPS = isWorker ? WORKER_STEPS : RESIDENT_STEPS;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Resident state
  const [city, setCity] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hiringFreq, setHiringFreq] = useState('');

  // ── Worker state
  const [expYears, setExpYears] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [workerCity, setWorkerCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');

  function toggleService(slug: string) {
    setSelectedServices((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);
  }

  function toggleCategory(slug: string) {
    setCategories((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);
  }

  async function complete() {
    setSaving(true);
    try {
      const authHeader = { Authorization: `Bearer ${token}` };
      if (isWorker) {
        await apiClient.put('/workers/me', {
          city: workerCity || 'תל אביב',
          yearsExperience: expYears ?? 0,
          categories,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          bio: bio.trim(),
          isAvailable: true,
        }, { headers: authHeader });
      } else {
        await apiClient.put('/auth/me', {
          city,
          preferredCategories: selectedServices,
        }, { headers: authHeader });
      }
    } catch {
      // best-effort — don't block login on API failure
    } finally {
      setSaving(false);
      setAuth(token, { ...user, city: isWorker ? undefined : city });
    }
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      complete();
    }
  }

  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // ── Step content renderers ─────────────────────────────────────────────────

  function renderCityGrid(selected: string, onSelect: (c: string) => void) {
    return (
      <View style={styles.chipsWrap}>
        {CITIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, selected === c && styles.chipSelected]}
            onPress={() => onSelect(c)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selected === c && styles.chipTextSelected]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderCategoryGrid(
    selectedList: string[],
    onToggle: (slug: string) => void,
  ) {
    return (
      <View style={styles.catGrid}>
        {CATEGORIES.map((cat) => {
          const sel = selectedList.includes(cat.slug);
          return (
            <TouchableOpacity
              key={cat.slug}
              style={[styles.catCell, sel && styles.catCellSelected]}
              onPress={() => onToggle(cat.slug)}
              activeOpacity={0.8}
            >
              <View style={[styles.catCellIcon, sel && styles.catCellIconSel]}>
                <Ionicons name={cat.icon as any} size={22} color={sel ? colors.white : colors.primary} />
              </View>
              <Text style={[styles.catCellText, sel && styles.catCellTextSel]} numberOfLines={2}>
                {cat.name_he}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderOptionList<T extends string | number>(
    options: { label: string; sub: string; value: T; icon?: any }[],
    selected: T | null,
    onSelect: (v: T) => void,
  ) {
    return (
      <View style={styles.optionList}>
        {options.map((opt) => {
          const sel = selected === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.optionCard, sel && styles.optionCardSel]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.85}
            >
              {opt.icon && (
                <View style={[styles.optionIcon, sel && styles.optionIconSel]}>
                  <Ionicons name={opt.icon} size={20} color={sel ? colors.white : colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, sel && styles.optionLabelSel]}>{opt.label}</Text>
                <Text style={[styles.optionSub, sel && styles.optionSubSel]}>{opt.sub}</Text>
              </View>
              <View style={[styles.optionCheck, sel && styles.optionCheckSel]}>
                {sel && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderWorkerProfileForm() {
    return (
      <View>
        <Text style={styles.formLabel}>באיזה עיר אתה עובד?</Text>
        <View style={styles.chipsWrap}>
          {CITIES.slice(0, 16).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, workerCity === c && styles.chipSelected]}
              onPress={() => setWorkerCity(c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, workerCity === c && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.formLabel, { marginTop: 24 }]}>תעריף שעתי (₪)</Text>
        <Text style={styles.formHint}>אופציונלי — ניתן לשנות בפרופיל</Text>
        <View style={styles.rateRow}>
          <View style={styles.rateCurrency}>
            <Text style={styles.rateCurrencyText}>₪</Text>
          </View>
          <TextInput
            style={[styles.formInput, { flex: 1 }]}
            value={hourlyRate}
            onChangeText={(t) => setHourlyRate(t.replace(/[^0-9]/g, ''))}
            placeholder="לדוגמה: 150"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numeric"
            textAlign="right"
          />
        </View>

        <Text style={[styles.formLabel, { marginTop: 24 }]}>קצת על עצמך</Text>
        <Text style={styles.formHint}>אופציונלי — מה שתכתוב יופיע בפרופיל שלך</Text>
        <TextInput
          style={[styles.formInput, styles.formTextArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="ספר ללקוחות על הניסיון והמומחיות שלך…"
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          textAlign="right"
          maxLength={300}
        />
      </View>
    );
  }

  // ── Render step content ────────────────────────────────────────────────────

  let content: React.ReactNode;

  if (isWorker) {
    if (step === 0) content = renderOptionList(
      EXP_OPTIONS.map((o) => ({ ...o, value: o.years })),
      expYears,
      setExpYears,
    );
    else if (step === 1) content = renderCategoryGrid(categories, toggleCategory);
    else content = renderWorkerProfileForm();
  } else {
    if (step === 0) content = renderCityGrid(city, setCity);
    else if (step === 1) content = renderCategoryGrid(selectedServices, toggleService);
    else content = renderOptionList(
      FREQ_OPTIONS as any,
      hiringFreq || null,
      setHiringFreq,
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header row: back · dots · skip */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep((s) => s - 1)} style={styles.navBtn}>
            <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotDone,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => complete()} style={styles.navBtn}>
          <Text style={styles.skipText}>דלג</Text>
        </TouchableOpacity>
      </View>

      {/* Step heading */}
      <View style={styles.stepHeading}>
        <View style={styles.stepIconWrap}>
          <Ionicons name={meta.icon as any} size={30} color={colors.white} />
        </View>
        <Text style={styles.stepTitle}>{meta.title}</Text>
        <Text style={styles.stepSub}>{meta.sub}</Text>
      </View>

      {/* Scrollable content + keyboard avoid */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>

        {/* Next / Complete button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.nextBtnText}>
                {isLast ? 'בוא נתחיל! 🚀' : 'המשך'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // Progress dots
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 28, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotDone: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryDark },

  // Step heading
  stepHeading: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Content scroll area
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  // City chips grid
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.white },

  // Category grid (2 columns)
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCell: {
    width: '47.5%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  catCellSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  catCellIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCellIconSel: { backgroundColor: colors.primary },
  catCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  catCellTextSel: { color: colors.primary },

  // Option cards (single-select list)
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardSel: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSel: { backgroundColor: colors.primary },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 2,
  },
  optionLabelSel: { color: colors.primaryDark },
  optionSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  optionSubSel: { color: colors.primary },
  optionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckSel: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Worker profile form (step 2)
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 10,
  },
  formHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -6,
    marginBottom: 10,
  },
  rateRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rateCurrency: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rateCurrencyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  formTextArea: { height: 110, paddingTop: 13 },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.7 },
  nextBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },
});
