import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { PostsStackParamList } from '../../navigation/types';
import { createPost } from '../../services/postsApi';
import { logger } from '../../utils/logger';

type Nav = NativeStackNavigationProp<PostsStackParamList>;

type Urgency = 'urgent' | 'today' | 'week' | 'flexible';

const URGENCY_OPTIONS: { value: Urgency; label: string; desc: string; color: string }[] = [
  { value: 'urgent',   label: 'דחוף',     desc: 'מיד',       color: '#DC2626' },
  { value: 'today',    label: 'היום',     desc: 'תוך שעות',   color: '#D97706' },
  { value: 'week',     label: 'השבוע',    desc: 'ימים ספורים', color: colors.primary },
  { value: 'flexible', label: 'לא דחוף',  desc: 'בנוחות',     color: '#16A34A' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation<Nav>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('flexible');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לתמונות בהגדרות');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  };

  const handleSubmit = async () => {
    setInlineError('');
    if (!title.trim()) { setInlineError('חובה להזין כותרת לעבודה'); return; }
    if (!category)     { setInlineError('חובה לבחור קטגוריה'); return; }

    setSubmitting(true);
    try {
      logger.info('CreatePost', 'submitting', { title: title.trim(), category, urgency });
      await createPost({
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budget ? Number(budget) : null,
        urgency,
        images,
        location: 'תל אביב',
      });
      Alert.alert(
        '✅ הפוסט פורסם!',
        'בעלי מקצוע מהאזור שלך יוכלו לראות אותו ולפנות אליך.',
        [{ text: 'מצוין', onPress: () => navigation.navigate('PostsFeed') }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'שגיאת חיבור לשרת';
      logger.error('CreatePost', 'submit failed', msg);
      setInlineError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Loading overlay ── */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>מפרסם את המודעה שלך…</Text>
            <Text style={styles.loadingSubText}>בעלי מקצוע יוכלו לראות אותה בקרוב</Text>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>פרסם עבודה</Text>
          <Text style={styles.pageSub}>תאר מה אתה מחפש ובעלי מקצוע יפנו אליך</Text>

          {/* Title */}
          <Text style={styles.label}>כותרת העבודה *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="לדוגמה: מחפש להתקין מדפים בחדר"
            placeholderTextColor={colors.textDisabled}
            textAlign="right"
            maxLength={120}
          />

          {/* Description */}
          <Text style={styles.label}>פירוט (אופציונלי)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="תאר את העבודה בפירוט — גודל, מיקום, חומרים נדרשים…"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign="right"
            maxLength={1000}
          />

          {/* Category */}
          <Text style={styles.label}>קטגוריה *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const sel = category === cat.slug;
              return (
                <TouchableOpacity
                  key={cat.slug}
                  style={[styles.catItem, sel && styles.catItemSelected]}
                  onPress={() => setCategory(cat.slug)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cat.icon as any} size={16} color={sel ? colors.white : colors.primary} />
                  <Text style={[styles.catItemText, sel && styles.catItemTextSelected]}>
                    {cat.name_he}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Budget */}
          <Text style={styles.label}>תקציב (₪) — אופציונלי</Text>
          <View style={styles.budgetRow}>
            <View style={styles.currencySign}>
              <Text style={styles.currencyText}>₪</Text>
            </View>
            <TextInput
              style={[styles.input, styles.budgetInput]}
              value={budget}
              onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ''))}
              placeholder="500"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>
          <Text style={styles.hint}>השאר ריק אם לא ידוע עדיין</Text>

          {/* Urgency */}
          <Text style={styles.label}>דחיפות</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => {
              const sel = urgency === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.urgencyBtn, sel && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                  onPress={() => setUrgency(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.urgencyLabel, sel && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={[styles.urgencyDesc, sel && { color: opt.color }]}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Images */}
          <Text style={styles.label}>תמונות (עד 4)</Text>
          <View style={styles.imagesRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.removeImg} onPress={() => setImages((p) => p.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 4 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                <Text style={styles.addImageText}>הוסף תמונה</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Inline error */}
          {inlineError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{inlineError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!title.trim() || !category) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name="send-outline" size={18} color={colors.white} />
            <Text style={styles.submitText}>פרסם עבודה</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  // Loading overlay
  loadingOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 32,
    alignItems: 'center', gap: 14, minWidth: 240,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  loadingText: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  loadingSubText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  pageSub: { fontSize: 14, color: colors.textMuted, textAlign: 'right', marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 8, marginTop: 20 },

  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.textPrimary, lineHeight: 22,
  },
  textArea: { height: 110, paddingTop: 13 },

  // Category
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    minWidth: '44%', flex: 1,
  },
  catItemSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  catItemText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, flexShrink: 1 },
  catItemTextSelected: { color: colors.white },

  // Budget
  budgetRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  budgetInput: { flex: 1 },
  currencySign: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  currencyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },

  // Urgency
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  urgencyLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  urgencyDesc: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // Images
  imagesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  imageThumb: { position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImageBtn: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addImageText: { fontSize: 10, color: colors.textMuted },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight, padding: 14, borderRadius: 12,
    marginTop: 16, borderWidth: 1, borderColor: colors.error + '40',
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right', fontWeight: '600' },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, paddingVertical: 17, borderRadius: 16, marginTop: 28,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32, shadowRadius: 10, elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
