import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { HomeStackParamList } from '../../navigation/types';
import { createBooking } from '../../services/bookingsApi';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type Route = RouteProp<HomeStackParamList, 'BookingRequest'>;

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'דחוף — עכשיו', icon: 'flash-outline' },
  { value: 'today',  label: 'היום',          icon: 'today-outline' },
  { value: 'week',   label: 'השבוע',          icon: 'calendar-outline' },
  { value: 'flexible', label: 'גמיש',          icon: 'time-outline' },
] as const;

type Urgency = (typeof URGENCY_OPTIONS)[number]['value'];

export default function BookingRequestScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [selectedCategory, setSelectedCategory] = useState(params.category ?? '');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('flexible');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!selectedCategory) { setError('נא לבחור קטגוריה'); return; }
    if (!description.trim()) { setError('נא לתאר את העבודה הנדרשת'); return; }

    setLoading(true);
    try {
      await createBooking({
        workerUserId: params.workerUserId,
        category: selectedCategory,
        description: `[${URGENCY_OPTIONS.find(u => u.value === urgency)?.label}] ${description.trim()}`,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'שגיאת חיבור');
      } else {
        setError('אירעה שגיאה');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>הבקשה נשלחה!</Text>
          <Text style={styles.successSub}>
            {params.workerName} יקבל את בקשתך וייצור איתך קשר בקרוב
          </Text>
          <Button
            title="לצפייה בהזמנות"
            onPress={() => navigation.getParent<any>()?.navigate('BookingsTab')}
            style={styles.successBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Worker info */}
          <View style={styles.workerBanner}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>{params.workerName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>{params.workerName}</Text>
              <Text style={styles.workerSubtitle}>בעל מקצוע</Text>
            </View>
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </View>

          {/* Urgency */}
          <Text style={styles.fieldLabel}>מתי אתם צריכים?</Text>
          <View style={styles.urgencyGrid}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.urgencyOption, urgency === opt.value && styles.urgencyOptionActive]}
                onPress={() => setUrgency(opt.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={urgency === opt.value ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.urgencyText, urgency === opt.value && styles.urgencyTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category selection */}
          <Text style={styles.fieldLabel}>סוג עבודה</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.catOption, selectedCategory === cat.slug && styles.catOptionActive]}
                onPress={() => setSelectedCategory(cat.slug)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={selectedCategory === cat.slug ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.catOptionText, selectedCategory === cat.slug && styles.catOptionTextActive]}>
                  {cat.name_he}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Input
            label="תיאור העבודה"
            placeholder="תארו את הבעיה או העבודה הנדרשת…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.descInput}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button title="שליחת בקשה" onPress={handleSubmit} loading={loading} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40 },
  workerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  workerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  workerSubtitle: { fontSize: 13, color: colors.textMuted },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', marginBottom: 10 },
  urgencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  urgencyOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  urgencyOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  urgencyText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  urgencyTextActive: { color: colors.primary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catOptionText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  catOptionTextActive: { color: colors.primary },
  descInput: { height: 100, textAlignVertical: 'top' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconWrap: { marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  successSub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  successBtn: { width: '100%' },
});
