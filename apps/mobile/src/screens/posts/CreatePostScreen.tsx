import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import { PostsStackParamList } from '../../navigation/types';
import { createPost } from '../../services/postsApi';

type Nav = NativeStackNavigationProp<PostsStackParamList>;

type Urgency = 'urgent' | 'today' | 'week' | 'flexible';

const URGENCY_OPTIONS: { value: Urgency; label: string; desc: string }[] = [
  { value: 'urgent', label: 'דחוף', desc: 'מיד' },
  { value: 'today', label: 'היום', desc: 'תוך שעות' },
  { value: 'week', label: 'השבוע', desc: 'גמיש' },
  { value: 'flexible', label: 'לא דחוף', desc: 'בנוחות' },
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

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לתמונות');
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

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('שדה חסר', 'יש להזין כותרת לעבודה');
      return;
    }
    if (!category) {
      Alert.alert('שדה חסר', 'יש לבחור קטגוריה');
      return;
    }
    setSubmitting(true);
    try {
      await createPost({
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budget ? Number(budget) : null,
        urgency,
        images,
      });
      Alert.alert(
        '✅ הפוסט פורסם!',
        'בעלי מקצוע מהאזור שלך יוכלו לראות אותו ולפנות אליך.',
        [{ text: 'מצוין', onPress: () => navigation.navigate('PostsFeed') }]
      );
    } catch (e: any) {
      Alert.alert('שגיאה', e?.response?.data?.message ?? 'לא ניתן לפרסם את הפוסט');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>פרסם עבודה</Text>
          <Text style={styles.pageSub}>תאר מה אתה מחפש ובעלי מקצוע יפנו אליך</Text>

          {/* Title */}
          <Text style={styles.label}>כותרת העבודה *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder='לדוגמה: מחפש להתקין מדפים בחדר'
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
            placeholder='תאר את העבודה בפירוט. מה הגודל, איפה, איזה חומרים...'
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
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={[
                  styles.catItem,
                  category === cat.slug && styles.catItemSelected,
                ]}
                onPress={() => setCategory(cat.slug)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={20}
                  color={category === cat.slug ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.catItemText,
                    category === cat.slug && styles.catItemTextSelected,
                  ]}
                >
                  {cat.name_he}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Budget */}
          <Text style={styles.label}>הצעת תשלום (₪)</Text>
          <View style={styles.budgetRow}>
            <View style={styles.currencySign}>
              <Text style={styles.currencyText}>₪</Text>
            </View>
            <TextInput
              style={[styles.input, styles.budgetInput]}
              value={budget}
              onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ''))}
              placeholder='500'
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>
          <Text style={styles.hint}>השאר ריק אם לא ידוע</Text>

          {/* Urgency */}
          <Text style={styles.label}>דחיפות</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.urgencyBtn, urgency === opt.value && styles.urgencyBtnSelected]}
                onPress={() => setUrgency(opt.value)}
              >
                <Text
                  style={[styles.urgencyLabel, urgency === opt.value && styles.urgencyLabelSelected]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[styles.urgencyDesc, urgency === opt.value && styles.urgencyDescSelected]}
                >
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Images */}
          <Text style={styles.label}>תמונות (עד 4)</Text>
          <View style={styles.imagesRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 4 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                <Text style={styles.addImageText}>הוסף</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="send-outline" size={18} color={colors.white} />
            <Text style={styles.submitText}>{submitting ? 'מפרסם...' : 'פרסם עבודה'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  pageSub: { fontSize: 14, color: colors.textMuted, textAlign: 'right', marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  textArea: { height: 110, paddingTop: 13 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '44%',
    flex: 1,
  },
  catItemSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  catItemText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', flexShrink: 1 },
  catItemTextSelected: { color: colors.white },
  budgetRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  budgetInput: { flex: 1 },
  currencySign: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  currencyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  urgencyBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  urgencyLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  urgencyLabelSelected: { color: colors.white },
  urgencyDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  urgencyDescSelected: { color: 'rgba(255,255,255,0.75)' },
  imagesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  imageThumb: { position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 10 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: { fontSize: 11, color: colors.textMuted },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
