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
  Switch,
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

// ── Static data ───────────────────────────────────────────────────────────────

const CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
  'נתניה', 'אשדוד', 'בני ברק', 'בת ים', 'חולון',
  'רמת גן', 'גבעתיים', 'הרצליה', 'כפר סבא', 'מודיעין',
  'אשקלון', 'רחובות', 'נס ציונה', 'חדרה', 'רמת השרון',
  'לוד', 'רמלה', 'ראש העין', 'יבנה', 'עפולה',
  'נהריה', 'טבריה', 'קריות', 'באר שבע', 'אחר',
];

const EXP_OPTIONS = [
  { label: 'רק מתחיל',      sub: '0–1 שנים',   years: 0,  icon: 'leaf-outline' as const },
  { label: 'יש לי ניסיון', sub: '1–5 שנים',   years: 2,  icon: 'trending-up-outline' as const },
  { label: 'ותיק',           sub: '5–10 שנים',  years: 7,  icon: 'ribbon-outline' as const },
  { label: 'מומחה',          sub: '10+ שנים',   years: 12, icon: 'trophy-outline' as const },
];

const FREQ_OPTIONS = [
  { label: 'כמעט אף פעם',       sub: 'פחות מפעם בשנה',    value: 'rarely' },
  { label: 'לפעמים',             sub: '1–3 פעמים בשנה',   value: 'sometimes' },
  { label: 'לעיתים קרובות',     sub: '3–6 פעמים בשנה',   value: 'often' },
  { label: 'תדיר מאוד',          sub: 'יותר מ-6 פעמים',   value: 'frequent' },
];

const URGENCY_CONFIG = [
  { key: 'urgent',   label: 'דחוף',    sub: 'צריך עכשיו',    icon: 'flash' as const,    color: '#DC2626' },
  { key: 'today',    label: 'היום',    sub: 'תוך שעות',      icon: 'sunny' as const,    color: '#D97706' },
  { key: 'week',     label: 'השבוע',   sub: 'ימים ספורים',   icon: 'calendar' as const, color: colors.primary },
  { key: 'flexible', label: 'גמיש',    sub: 'בנוחות',        icon: 'leaf' as const,     color: '#16A34A' },
];

const RESIDENT_STEPS = [
  { icon: 'location'  as const, title: 'מאיפה אתה?',           sub: 'נביא לך בעלי מקצוע מהאזור שלך' },
  { icon: 'construct' as const, title: 'מה אתה הכי צריך?',     sub: 'נדע מה לחפש עבורך ראשון' },
  { icon: 'repeat'    as const, title: 'כמה פעמים בשנה?',      sub: 'נתאים לך את חוויית השימוש' },
];

const WORKER_STEPS = [
  { icon: 'star'    as const, title: 'כמה שנות ניסיון יש לך?', sub: 'יעזור ללקוחות לסמוך עליך' },
  { icon: 'hammer'  as const, title: 'מה הם התחומים שלך?',      sub: 'בחר הכל שרלוונטי — ניתן לשנות בהמשך' },
  { icon: 'cash'    as const, title: 'מה התעריפים שלך?',        sub: 'קבע מחיר שונה לפי דחיפות הלקוח' },
  { icon: 'school'  as const, title: 'שירות הדרכה',             sub: 'האם תרצה ללמד לקוחות תוך כדי עבודה?' },
];

// ── City autocomplete sub-component ──────────────────────────────────────────

function CityAutocomplete({
  value,
  onChange,
  placeholder = 'הקלד עיר…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const suggestions = query.length >= 1
    ? CITIES.filter((c) => c.includes(query) && c !== query).slice(0, 6)
    : [];

  function select(c: string) {
    setQuery(c);
    onChange(c);
    setOpen(false);
  }

  return (
    <View>
      <View style={styles.autoRow}>
        <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.autoIcon} />
        <TextInput
          style={styles.autoInput}
          value={query}
          onChangeText={(t) => { setQuery(t); onChange(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          textAlign="right"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); onChange(''); setOpen(false); }}>
            <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((c) => (
            <TouchableOpacity key={c} style={styles.suggItem} onPress={() => select(c)}>
              <Ionicons name="location-outline" size={13} color={colors.primary} />
              <Text style={styles.suggText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [urgencyRates, setUrgencyRates] = useState({ urgent: '', today: '', week: '', flexible: '' });
  const [offersTeaching, setOffersTeaching] = useState(false);
  const [teachingRate, setTeachingRate] = useState('');
  const [bio, setBio] = useState('');

  function setUrgRate(key: keyof typeof urgencyRates, val: string) {
    setUrgencyRates((prev) => ({ ...prev, [key]: val.replace(/[^0-9]/g, '') }));
  }

  function toggleCat(slug: string) {
    setCategories((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);
  }

  function toggleService(slug: string) {
    setSelectedServices((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);
  }

  async function complete() {
    setSaving(true);
    try {
      const auth = { Authorization: `Bearer ${token}` };
      if (isWorker) {
        const rates = {
          urgent:   urgencyRates.urgent   ? Number(urgencyRates.urgent)   : null,
          today:    urgencyRates.today    ? Number(urgencyRates.today)    : null,
          week:     urgencyRates.week     ? Number(urgencyRates.week)     : null,
          flexible: urgencyRates.flexible ? Number(urgencyRates.flexible) : null,
        };
        // derive a single hourlyRate from the cheapest filled rate (for backward compat)
        const filled = Object.values(rates).filter(Boolean) as number[];
        const baseRate = filled.length ? Math.min(...filled) : null;

        await apiClient.put('/workers/me', {
          city: workerCity || 'תל אביב',
          yearsExperience: expYears ?? 0,
          categories,
          hourlyRate: baseRate,
          urgencyRates: rates,
          offersTeaching,
          teachingRate: teachingRate ? Number(teachingRate) : null,
          bio: bio.trim(),
          isAvailable: true,
        }, { headers: auth });
      } else {
        await apiClient.put('/auth/me', {
          city,
          preferredCategories: selectedServices,
        }, { headers: auth });
      }
    } catch {
      // best-effort — don't block login on API failure
    } finally {
      setSaving(false);
      setAuth(token, { ...user, city: isWorker ? user.city : city });
    }
  }

  function goNext() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else complete();
  }

  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // ── Step renderers ────────────────────────────────────────────────────────

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

  function renderCategoryGrid(selectedList: string[], onToggle: (s: string) => void) {
    return (
      <View style={styles.catGrid}>
        {CATEGORIES.map((cat) => {
          const sel = selectedList.includes(cat.slug);
          return (
            <TouchableOpacity
              key={cat.slug}
              style={[styles.catCell, sel && styles.catCellSel]}
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

  // Worker step 2: Location + urgency rates
  function renderRatesStep() {
    return (
      <View style={{ gap: 24 }}>
        {/* City */}
        <View>
          <Text style={styles.fieldLabel}>באיזה עיר אתה עובד?</Text>
          <CityAutocomplete value={workerCity} onChange={setWorkerCity} placeholder="לדוגמה: תל אביב" />
        </View>

        {/* Urgency rates */}
        <View>
          <Text style={styles.fieldLabel}>תעריף לפי דחיפות</Text>
          <Text style={styles.fieldHint}>השאר ריק אם אין לך העדפה לאותה רמה</Text>
          <View style={styles.urgencyRatesCard}>
            {URGENCY_CONFIG.map(({ key, label, sub, icon, color }, idx) => (
              <View key={key}>
                {idx > 0 && <View style={styles.rateDivider} />}
                <View style={styles.rateRow}>
                  <View style={[styles.rateIconBadge, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon as any} size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rateLabel}>{label}</Text>
                    <Text style={styles.rateSub}>{sub}</Text>
                  </View>
                  <View style={styles.rateInputWrap}>
                    <Text style={styles.rateCurrencyInline}>₪</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={urgencyRates[key as keyof typeof urgencyRates]}
                      onChangeText={(t) => setUrgRate(key as keyof typeof urgencyRates, t)}
                      placeholder="—"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <Text style={styles.rateUnit}>/שעה</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Worker step 3: Teaching service + bio
  function renderTeachingStep() {
    return (
      <View style={{ gap: 20 }}>
        {/* Teaching toggle card */}
        <TouchableOpacity
          style={[styles.teachCard, offersTeaching && styles.teachCardActive]}
          onPress={() => setOffersTeaching((v) => !v)}
          activeOpacity={0.85}
        >
          <View style={styles.teachHeader}>
            <View style={[styles.teachIconWrap, offersTeaching && styles.teachIconWrapActive]}>
              <Ionicons name="school" size={26} color={offersTeaching ? colors.white : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.teachTitle, offersTeaching && styles.teachTitleActive]}>
                שירות הדרכה
              </Text>
              <Text style={styles.teachSubtitle}>בתשלום נוסף</Text>
            </View>
            <Switch
              value={offersTeaching}
              onValueChange={setOffersTeaching}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <Text style={[styles.teachDesc, offersTeaching && styles.teachDescActive]}>
            תסביר ללקוח מה אתה עושה ולמה תוך כדי עבודה — כדי שבפעם הבאה
            יוכל להתמודד לבד. הלקוח ישלם תוספת על ההדרכה.
          </Text>
        </TouchableOpacity>

        {/* Teaching rate — shown only if opted in */}
        {offersTeaching && (
          <View>
            <Text style={styles.fieldLabel}>תוספת מחיר על הדרכה</Text>
            <Text style={styles.fieldHint}>כמה לגבות נוסף על שעת ההדרכה</Text>
            <View style={styles.singleRateRow}>
              <View style={styles.rateCurrencyBox}>
                <Text style={styles.rateCurrencyBoxText}>₪</Text>
              </View>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={teachingRate}
                onChangeText={(t) => setTeachingRate(t.replace(/[^0-9]/g, ''))}
                placeholder="50"
                placeholderTextColor={colors.textDisabled}
                keyboardType="numeric"
                textAlign="right"
              />
              <View style={styles.rateUnitBox}>
                <Text style={styles.rateUnitBoxText}>/שעה</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bio */}
        <View>
          <Text style={styles.fieldLabel}>קצת על עצמך</Text>
          <Text style={styles.fieldHint}>אופציונלי — יופיע בפרופיל שלך</Text>
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
      </View>
    );
  }

  // Resident step 0: city autocomplete
  function renderResidentCityStep() {
    return (
      <View>
        <Text style={styles.fieldLabel}>הקלד את העיר שלך</Text>
        <CityAutocomplete value={city} onChange={setCity} placeholder="לדוגמה: תל אביב" />
        <Text style={styles.fieldHint}>ניתן גם לרשום עיר שאינה ברשימה</Text>
      </View>
    );
  }

  // ── Assemble step content ─────────────────────────────────────────────────

  let content: React.ReactNode;

  if (isWorker) {
    if (step === 0) content = renderOptionList(
      EXP_OPTIONS.map((o) => ({ ...o, value: o.years })),
      expYears, setExpYears,
    );
    else if (step === 1) content = renderCategoryGrid(categories, toggleCat);
    else if (step === 2) content = renderRatesStep();
    else                  content = renderTeachingStep();
  } else {
    if (step === 0) content = renderResidentCityStep();
    else if (step === 1) content = renderCategoryGrid(selectedServices, toggleService);
    else content = renderOptionList(
      FREQ_OPTIONS.map((o) => ({ ...o, value: o.value })) as any,
      hiringFreq || null, setHiringFreq,
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep((s) => s - 1)} style={styles.navBtn}>
            <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.navBtn} />}

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

      {/* Scrollable content */}
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

        {/* Next / Complete */}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // Dots
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 28, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotDone: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryDark },

  // Step heading
  stepHeading: {
    alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 20,
  },
  stepIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  stepTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  // Content
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  // City autocomplete
  autoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, gap: 8,
  },
  autoIcon: { marginEnd: 2 },
  autoInput: {
    flex: 1, fontSize: 15, color: colors.textPrimary,
    paddingVertical: 13,
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginTop: 4,
    overflow: 'hidden',
  },
  suggItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderColor: colors.borderLight,
  },
  suggText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCell: {
    width: '47.5%', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 8,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, gap: 8,
  },
  catCellSel: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  catCellIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  catCellIconSel: { backgroundColor: colors.primary },
  catCellText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  catCellTextSel: { color: colors.primary },

  // Option list (experience / frequency)
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: colors.border,
  },
  optionCardSel: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  optionIconSel: { backgroundColor: colors.primary },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  optionLabelSel: { color: colors.primaryDark },
  optionSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  optionSubSel: { color: colors.primary },
  optionCheck: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  optionCheckSel: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Field labels & hints
  fieldLabel: {
    fontSize: 14, fontWeight: '700', color: colors.textPrimary,
    textAlign: 'right', marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: -4, marginBottom: 10,
  },

  // Urgency rates card
  urgencyRatesCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  rateDivider: { height: 1, backgroundColor: colors.borderLight },
  rateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rateIconBadge: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  rateLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  rateSub: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 1 },
  rateInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 6, minWidth: 90,
  },
  rateCurrencyInline: { fontSize: 13, fontWeight: '700', color: colors.primary },
  rateInput: {
    fontSize: 15, fontWeight: '700', color: colors.textPrimary,
    minWidth: 44, paddingVertical: 0,
  },
  rateUnit: { fontSize: 11, color: colors.textMuted },

  // Teaching toggle card
  teachCard: {
    backgroundColor: colors.surface, borderRadius: 18,
    borderWidth: 2, borderColor: colors.border, padding: 18, gap: 12,
  },
  teachCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  teachHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teachIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  teachIconWrapActive: { backgroundColor: colors.primary },
  teachTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  teachTitleActive: { color: colors.primaryDark },
  teachSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  teachDesc: {
    fontSize: 13, color: colors.textMuted, textAlign: 'right',
    lineHeight: 22,
  },
  teachDescActive: { color: colors.textSecondary },

  // Teaching rate + bio inputs
  singleRateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rateCurrencyBox: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  rateCurrencyBoxText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  rateUnitBox: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12,
  },
  rateUnitBoxText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  formInput: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.textPrimary,
  },
  formTextArea: { height: 110, paddingTop: 13 },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 16,
    backgroundColor: colors.background,
    borderTopWidth: 1, borderColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.7 },
  nextBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },
});
