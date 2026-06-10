import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { PostsStackParamList } from '../../navigation/types';
import { updateMyProfile } from '../../services/authApi';
import { acceptQuote, getJobQuotes, rejectQuote } from '../../services/quotesApi';
import { useAuthStore } from '../../store/authStore';
import { Quote } from '../../types';
import { logger } from '../../utils/logger';

type Nav = NativeStackNavigationProp<PostsStackParamList>;
type Route = RouteProp<PostsStackParamList, 'QuotesList'>;

type SortKey = 'price' | 'rating';

const STATUS_CONFIG = {
  pending:  { label: 'בהמתנה',  color: colors.warning,   bg: colors.warningLight },
  accepted: { label: 'התקבלה',  color: colors.success,   bg: colors.successLight },
  rejected: { label: 'נדחתה',   color: colors.textMuted, bg: colors.borderLight  },
};

export default function QuotesListScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('price');
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  // Phone step
  const [phoneStepQuote, setPhoneStepQuote] = useState<Quote | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { quotes: data } = await getJobQuotes(params.postId);
      setQuotes(data);
    } catch (e: any) {
      logger.error('QuotesList', 'load failed', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.postId]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...quotes].sort((a, b) => {
    if (sortBy === 'price')  return a.proposedPrice - b.proposedPrice;
    if (sortBy === 'rating') return b.worker.rating - a.worker.rating;
    return 0;
  });

  const handleAccept = (quote: Quote) => {
    setConfirmAcceptId(quote._id);
  };

  const doAccept = async (quote: Quote) => {
    setConfirmAcceptId(null);
    // If user has no phone, require it first
    if (!user?.phone?.trim()) {
      setPhoneInput('');
      setPhoneError('');
      setPhoneStepQuote(quote);
      return;
    }
    await _executeAccept(quote);
  };

  const _executeAccept = async (quote: Quote) => {
    setActionId(quote._id);
    try {
      await acceptQuote(quote._id);
      await load();
      navigation.goBack();
    } catch (e: any) {
      logger.error('QuotesList', 'accept failed', e?.message);
    } finally {
      setActionId(null);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneStepQuote) return;
    const cleaned = phoneInput.trim();
    if (!cleaned || cleaned.length < 9) {
      setPhoneError('אנא הזן מספר טלפון תקין (לפחות 9 ספרות)');
      return;
    }
    setSavingPhone(true);
    try {
      await updateMyProfile({ phone: cleaned });
      updateUser({ phone: cleaned });
      const q = phoneStepQuote;
      setPhoneStepQuote(null);
      await _executeAccept(q);
    } catch {
      setPhoneError('לא ניתן לשמור את מספר הטלפון, נסה שוב');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleReject = async (quote: Quote) => {
    setActionId(quote._id);
    try {
      await rejectQuote(quote._id);
      setQuotes((prev) => prev.map((q) => q._id === quote._id ? { ...q, status: 'rejected' } : q));
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לדחות את ההצעה');
    } finally {
      setActionId(null);
    }
  };

  const pending  = sorted.filter((q) => q.status === 'pending');
  const accepted = sorted.filter((q) => q.status === 'accepted');
  const rejected = sorted.filter((q) => q.status === 'rejected');
  const orderedQuotes = [...accepted, ...pending, ...rejected];

  const hasAccepted = quotes.some((q) => q.status === 'accepted');

  if (phoneStepQuote) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.phoneStepContent} keyboardShouldPersistTaps="handled">
            <View style={styles.phoneStepCard}>
              <View style={styles.phoneStepIcon}>
                <Ionicons name="call" size={32} color={colors.primary} />
              </View>
              <Text style={styles.phoneStepTitle}>פרטי יצירת קשר</Text>
              <Text style={styles.phoneStepSub}>
                כדי שבעל המקצוע יוכל ליצור איתך קשר ולקבוע מועד לביצוע העבודה, אנא הזן מספר טלפון לחזרה.
              </Text>

              <View style={styles.phoneStepWorkerBanner}>
                <View style={styles.phoneStepWorkerAvatar}>
                  <Text style={styles.phoneStepWorkerAvatarText}>
                    {phoneStepQuote.worker.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phoneStepWorkerName}>{phoneStepQuote.worker.user.name}</Text>
                  <Text style={styles.phoneStepWorkerPrice}>
                    ₪{phoneStepQuote.proposedPrice.toLocaleString('he-IL')}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              </View>

              <Text style={styles.phoneStepLabel}>מספר טלפון *</Text>
              <TextInput
                style={[styles.phoneStepInput, phoneError ? styles.phoneStepInputError : null]}
                value={phoneInput}
                onChangeText={(t) => { setPhoneInput(t.replace(/[^0-9\-+]/g, '')); setPhoneError(''); }}
                placeholder="05X-XXXXXXX"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                textAlign="right"
                autoFocus
              />
              {phoneError ? (
                <View style={styles.phoneErrBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={styles.phoneErrText}>{phoneError}</Text>
                </View>
              ) : null}
              <Text style={styles.phoneStepHint}>המספר יוצג לבעל המקצוע בלבד לאחר האישור</Text>

              <TouchableOpacity
                style={[styles.phoneStepBtn, savingPhone && { opacity: 0.7 }]}
                onPress={handlePhoneSubmit}
                disabled={savingPhone}
                activeOpacity={0.85}
              >
                {savingPhone ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                    <Text style={styles.phoneStepBtnText}>אשר הזמנה ושלח טלפון</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.phoneStepCancel} onPress={() => setPhoneStepQuote(null)}>
                <Text style={styles.phoneStepCancelText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {/* Header summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{quotes.length}</Text>
              <Text style={styles.summaryLabel}>הצעות</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {quotes.length > 0 ? `₪${Math.min(...quotes.map((q) => q.proposedPrice)).toLocaleString('he-IL')}` : '—'}
              </Text>
              <Text style={styles.summaryLabel}>הזולה ביותר</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {quotes.length > 0 ? `₪${Math.max(...quotes.map((q) => q.proposedPrice)).toLocaleString('he-IL')}` : '—'}
              </Text>
              <Text style={styles.summaryLabel}>היקרה ביותר</Text>
            </View>
          </View>

          {/* Sort bar */}
          {quotes.length > 1 && !hasAccepted && (
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>מיין לפי:</Text>
              {(['price', 'rating'] as SortKey[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.sortBtn, sortBy === k && styles.sortBtnActive]}
                  onPress={() => setSortBy(k)}
                >
                  <Ionicons
                    name={k === 'price' ? 'cash-outline' : 'star-outline'}
                    size={13}
                    color={sortBy === k ? colors.white : colors.textSecondary}
                  />
                  <Text style={[styles.sortBtnText, sortBy === k && styles.sortBtnTextActive]}>
                    {k === 'price' ? 'מחיר' : 'דירוג'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quote cards */}
          {quotes.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="hourglass-outline" size={52} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>עדיין לא הגיעו הצעות</Text>
              <Text style={styles.emptyText}>בעלי מקצוע יוכלו לשלוח הצעות בקרוב</Text>
            </View>
          ) : (
            orderedQuotes.map((quote, idx) => {
              const cfg = STATUS_CONFIG[quote.status];
              const isActionTarget = actionId === quote._id;
              const catName = (quote.worker.categories ?? [])
                .slice(0, 2)
                .map((s) => getCategoryBySlug(s)?.name_he ?? s)
                .join(', ');

              return (
                <View
                  key={quote._id}
                  style={[
                    styles.quoteCard,
                    quote.status === 'accepted' && styles.quoteCardAccepted,
                    quote.status === 'rejected' && styles.quoteCardRejected,
                  ]}
                >
                  {/* Rank badge for pending quotes */}
                  {quote.status === 'pending' && sortBy === 'price' && idx < accepted.length + 3 && (
                    <View style={[styles.rankBadge, idx === accepted.length && styles.rankBadge1]}>
                      <Text style={styles.rankBadgeText}>
                        #{idx - accepted.length + 1} {idx === accepted.length ? '🏆' : ''}
                      </Text>
                    </View>
                  )}

                  {/* Worker header */}
                  <View style={styles.workerRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {quote.worker.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workerName}>{quote.worker.user.name}</Text>
                      {catName ? <Text style={styles.workerCats} numberOfLines={1}>{catName}</Text> : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Worker stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="star" size={13} color={colors.star} />
                      <Text style={styles.statValue}>
                        {quote.worker.rating > 0 ? quote.worker.rating.toFixed(1) : 'חדש'}
                      </Text>
                    </View>
                    <Text style={styles.statDot}>·</Text>
                    <View style={styles.statItem}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.statValue}>{quote.worker.reviewCount} ביקורות</Text>
                    </View>
                    {quote.worker.city ? (
                      <>
                        <Text style={styles.statDot}>·</Text>
                        <View style={styles.statItem}>
                          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                          <Text style={styles.statValue}>{quote.worker.city}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>

                  {/* Price + arrival */}
                  <View style={styles.priceRow}>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>מחיר מוצע</Text>
                      <Text style={styles.price}>₪{quote.proposedPrice.toLocaleString('he-IL')}</Text>
                    </View>
                    {quote.estimatedArrivalDate && (
                      <View style={styles.arrivalBox}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.arrivalText}>
                          {new Date(quote.estimatedArrivalDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Message */}
                  {quote.message ? (
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText} numberOfLines={3}>{quote.message}</Text>
                    </View>
                  ) : null}

                  {/* Actions */}
                  {quote.status === 'pending' && !hasAccepted && (
                    confirmAcceptId === quote._id ? (
                      <View style={styles.confirmRow}>
                        <View style={styles.confirmPrompt}>
                          <Text style={styles.confirmText}>
                            לבחור את {quote.worker.user.name} ב-₪{quote.proposedPrice.toLocaleString('he-IL')}?
                          </Text>
                          <Text style={styles.confirmSub}>שאר ההצעות יידחו אוטומטית</Text>
                        </View>
                        <View style={styles.confirmBtns}>
                          <TouchableOpacity
                            style={styles.confirmYes}
                            onPress={() => doAccept(quote)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={15} color={colors.white} />
                            <Text style={styles.confirmYesText}>כן, בחר</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.confirmNo}
                            onPress={() => setConfirmAcceptId(null)}
                          >
                            <Text style={styles.confirmNoText}>ביטול</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={[styles.rejectBtn, isActionTarget && { opacity: 0.5 }]}
                          onPress={() => handleReject(quote)}
                          disabled={!!actionId}
                        >
                          <Text style={styles.rejectBtnText}>דחה</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.acceptBtn, isActionTarget && { opacity: 0.5 }]}
                          onPress={() => handleAccept(quote)}
                          disabled={!!actionId}
                        >
                          {isActionTarget ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                              <Text style={styles.acceptBtnText}>בחר בעל מקצוע</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )
                  )}

                  {quote.status === 'accepted' && (
                    <View style={styles.acceptedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.acceptedBannerText}>בעל המקצוע נבחר — ההזמנה נוצרה</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },

  summaryRow: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16,
    padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sortLabel: { fontSize: 13, color: colors.textMuted, marginEnd: 4 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  sortBtnTextActive: { color: colors.white },

  quoteCard: {
    backgroundColor: colors.surface, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
    position: 'relative', overflow: 'hidden',
  },
  quoteCardAccepted: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
  quoteCardRejected: { opacity: 0.6, borderColor: colors.borderLight },

  rankBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: colors.borderLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rankBadge1: { backgroundColor: '#FEF3C7' },
  rankBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.white },
  workerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  workerCats: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'flex-end' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 12, color: colors.textSecondary },
  statDot: { color: colors.textDisabled, fontSize: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  price: { fontSize: 22, fontWeight: '900', color: colors.primary },
  arrivalBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  arrivalText: { fontSize: 13, color: colors.textSecondary },

  messageBox: {
    backgroundColor: colors.background, borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
  },
  messageText: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', lineHeight: 20 },

  confirmRow: { marginTop: 8, gap: 8 },
  confirmPrompt: { backgroundColor: colors.warningLight, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.warning + '40' },
  confirmText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  confirmSub: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmYes: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, paddingVertical: 11, borderRadius: 10 },
  confirmYesText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  confirmNo: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
  confirmNoText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  acceptedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.successLight, borderRadius: 10, padding: 10, marginTop: 4,
  },
  acceptedBannerText: { fontSize: 13, fontWeight: '600', color: colors.success },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // Phone step
  phoneStepContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  phoneStepCard: {
    backgroundColor: colors.surface, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  phoneStepIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  phoneStepTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  phoneStepSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  phoneStepWorkerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.successLight, borderRadius: 14, padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: colors.success + '30',
  },
  phoneStepWorkerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  phoneStepWorkerAvatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
  phoneStepWorkerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  phoneStepWorkerPrice: { fontSize: 13, color: colors.success, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  phoneStepLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  phoneStepInput: {
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: colors.textPrimary, textAlign: 'right',
  },
  phoneStepInputError: { borderColor: colors.error },
  phoneErrBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  phoneErrText: { fontSize: 12, color: colors.error, flex: 1, textAlign: 'right' },
  phoneStepHint: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 24 },
  phoneStepBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  phoneStepBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  phoneStepCancel: { alignItems: 'center', paddingTop: 16 },
  phoneStepCancelText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
