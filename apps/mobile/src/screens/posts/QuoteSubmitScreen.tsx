import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
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
import { PostsStackParamList } from '../../navigation/types';
import { submitQuote } from '../../services/quotesApi';
import { logger } from '../../utils/logger';

type Nav = NativeStackNavigationProp<PostsStackParamList>;
type Route = RouteProp<PostsStackParamList, 'QuoteSubmit'>;

const ARRIVAL_OPTIONS = [
  { label: 'היום',        value: 0 },
  { label: 'מחר',         value: 1 },
  { label: 'תוך 3 ימים',  value: 3 },
  { label: 'תוך שבוע',    value: 7 },
];

export default function QuoteSubmitScreen() {
  const navigation = useNavigation<Nav>();
  const { params }  = useRoute<Route>();

  const [price, setPrice]         = useState('');
  const [message, setMessage]     = useState('');
  const [arrivalDays, setArrival] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!price || Number(price) <= 0) {
      setError('יש להזין מחיר תקין');
      return;
    }
    setSubmitting(true);
    try {
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() + arrivalDays);

      logger.info('QuoteSubmit', 'submitting', { postId: params.postId, price });
      await submitQuote({
        jobPostId:           params.postId,
        proposedPrice:       Number(price),
        message:             message.trim(),
        estimatedArrivalDate: arrivalDate.toISOString(),
      });
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'שגיאת חיבור';
      logger.error('QuoteSubmit', msg);
      setError(msg);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Job context */}
          <View style={styles.jobBanner}>
            <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
            <Text style={styles.jobBannerText} numberOfLines={2}>{params.postTitle}</Text>
          </View>

          {/* Price */}
          <Text style={styles.label}>המחיר שלך (₪) *</Text>
          <View style={styles.priceRow}>
            <View style={styles.currencyWrap}>
              <Text style={styles.currencySymbol}>₪</Text>
            </View>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
              placeholder="500"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>
          <Text style={styles.hint}>המחיר שהלקוח יראה — הכנס מחיר תחרותי ואמין</Text>

          {/* Arrival */}
          <Text style={styles.label}>מתי תוכל להגיע?</Text>
          <View style={styles.arrivalGrid}>
            {ARRIVAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.arrivalBtn, arrivalDays === opt.value && styles.arrivalBtnActive]}
                onPress={() => setArrival(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.arrivalText, arrivalDays === opt.value && styles.arrivalTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={styles.label}>מסר ללקוח (אופציונלי)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="הסבר ניסיון רלוונטי, גישה לעבודה, מה כלול במחיר…"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign="right"
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={16} color={colors.warning} />
              <Text style={styles.tipsTitle}>טיפים להצעה מוצלחת</Text>
            </View>
            {[
              'הזכר ניסיון רלוונטי לסוג העבודה',
              'ציין מה כלול במחיר (חומרים, עבודה)',
              'היה זמין לשאלות אחרי ששלחת',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!price || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!price || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <Text style={styles.submitText}>שולח…</Text>
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={colors.white} />
                <Text style={styles.submitText}>שלח הצעת מחיר</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  jobBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14,
    marginBottom: 24, borderWidth: 1, borderColor: colors.primary + '30',
  },
  jobBannerText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, flex: 1, textAlign: 'right', lineHeight: 20 },

  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 8, marginTop: 20 },
  hint:  { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 6 },
  charCount: { fontSize: 11, color: colors.textDisabled, textAlign: 'left', marginTop: 4 },

  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.textPrimary,
  },
  priceRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  priceInput: { flex: 1 },
  currencyWrap: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  currencySymbol: { fontSize: 18, fontWeight: '800', color: colors.primary },
  textArea: { height: 110, paddingTop: 13, lineHeight: 22 },

  arrivalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  arrivalBtn: {
    flex: 1, minWidth: '44%', alignItems: 'center', paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  arrivalBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  arrivalText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  arrivalTextActive: { color: colors.primary },

  tipsCard: {
    backgroundColor: colors.warningLight, borderRadius: 14, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: colors.warning + '40',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.warning },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipText: { fontSize: 12, color: colors.textSecondary, flex: 1, textAlign: 'right', lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.errorLight, padding: 14, borderRadius: 12, marginTop: 16,
    borderWidth: 1, borderColor: colors.error + '40',
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1, textAlign: 'right', fontWeight: '600' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, paddingVertical: 17, borderRadius: 16, marginTop: 28,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
