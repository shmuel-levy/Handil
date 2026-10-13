import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonList } from '../../components/common/Skeleton';
import WorkOrderTag from '../../components/site/WorkOrderTag';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { leadingEdge, monoFont, plateEdge, radius } from '../../constants/theme';
import { getMyBookings, updateBookingStatus } from '../../services/bookingsApi';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useAuthStore } from '../../store/authStore';
import { Booking } from '../../types';

/** Status as an inspection stamp: label, ink colour and paper colour. */
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'ממתין',  color: colors.warning,   bg: colors.warningLight, icon: 'time-outline' },
  accepted:  { label: 'אושר',   color: colors.success,   bg: colors.successLight, icon: 'checkmark-circle-outline' },
  rejected:  { label: 'נדחה',   color: colors.error,     bg: colors.errorLight,   icon: 'close-circle-outline' },
  completed: { label: 'הושלם',  color: colors.blueprint, bg: colors.blueprintLight, icon: 'ribbon-outline' },
  cancelled: { label: 'בוטל',   color: colors.textMuted, bg: colors.borderLight,  icon: 'remove-circle-outline' },
};

type Action = 'accepted' | 'rejected' | 'completed' | 'cancelled';

export default function BookingsScreen() {
  const user = useAuthStore((s) => s.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError('');
    try {
      const { bookings: data } = await getMyBookings();
      setBookings(data);
    } catch (e: any) {
      // Used to become an empty list, which looked exactly like "no bookings"
      setError(e?.response?.data?.message ?? 'לא הצלחנו לטעון את ההזמנות. בדקו את החיבור');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Real-time: refresh booking list when any booking status changes
  useSocketEvent('booking_updated', () => { load(); });

  async function handleAction(bookingId: string, status: Action) {
    setBusyId(bookingId);
    try {
      const { booking } = await updateBookingStatus(bookingId, status);
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? booking : b)));
    } catch (e: any) {
      // Previously silent: the button did nothing and the user tapped again
      Alert.alert('הפעולה נכשלה', e?.response?.data?.message ?? 'נסו שוב בעוד רגע');
      load();
    } finally {
      setBusyId(null);
    }
  }

  function renderActions(booking: Booking) {
    if (booking.status !== 'pending' && booking.status !== 'accepted') return null;
    const isWorker = user?.role === 'worker';
    const isResident = user?.role === 'resident';
    const busy = busyId === booking._id;

    const btn = (label: string, status: Action, kind: 'go' | 'stop' | 'done') => (
      <TouchableOpacity
        key={status}
        style={[styles.actionBtn, styles[`btn_${kind}`], busy && styles.actionBusy]}
        onPress={() => handleAction(booking._id, status)}
        disabled={busy}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: busy, busy }}
      >
        <Text style={[styles.actionText, kind === 'stop' && styles.actionTextStop]}>{label}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.actionsRow}>
        {isWorker && booking.status === 'pending' && [
          btn('קבל עבודה', 'accepted', 'go'),
          btn('דחה', 'rejected', 'stop'),
        ]}
        {isWorker && booking.status === 'accepted' && btn('סמן כהושלם', 'completed', 'done')}
        {isResident && booking.status === 'pending' && btn('בטל הזמנה', 'cancelled', 'stop')}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <SkeletonList count={4} variant="post" />
      </SafeAreaView>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const cat = getCategoryBySlug(item.category);
          const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
          const otherParty = user?.role === 'resident' ? item.worker : item.resident;

          return (
            <View style={[styles.card, leadingEdge(status.color, 5)]}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>{otherParty?.name?.charAt(0) ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyName} numberOfLines={1}>{otherParty?.name}</Text>
                    <Text style={styles.categoryText}>{cat?.name_he ?? item.category}</Text>
                  </View>
                </View>
                <View
                  style={[styles.stamp, { borderColor: status.color, backgroundColor: status.bg }]}
                  accessibilityLabel={`סטטוס: ${status.label}`}
                >
                  <Ionicons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.stampText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View style={styles.metaRow}>
                <WorkOrderTag id={item._id} />
                <View style={styles.metaEnd}>
                  {item.price != null ? (
                    <Text style={styles.price}>₪{item.price.toLocaleString('he-IL')}</Text>
                  ) : null}
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleDateString('he-IL', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              {renderActions(item)}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={34} color={colors.asphalt} />
            </View>
            <Text style={styles.emptyTitle}>אין הזמנות עדיין</Text>
            <Text style={styles.emptySub}>
              {user?.role === 'resident'
                ? 'חפשו בעל מקצוע ושלחו בקשת הזמנה'
                : 'הזמנות מלקוחות יופיעו כאן'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 30, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    // Status-coloured edge so a scan of the list shows what needs attention
    ...plateEdge(colors.border, 3),
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.asphalt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 16, fontWeight: '900', color: colors.hazard },
  partyName: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  categoryText: { fontSize: 12, color: colors.textMuted, marginTop: 1, textAlign: 'right' },
  // Rubber-stamp look: outlined, slightly tilted
  stamp: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm, borderWidth: 1.5,
    transform: [{ rotate: '-3deg' }],
  },
  stampText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  description: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontFamily: monoFont, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  dateText: { fontSize: 11, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  actionBusy: { opacity: 0.55 },
  btn_go: { backgroundColor: colors.success, ...plateEdge('#0F5F2D', 3) },
  btn_done: { backgroundColor: colors.primary, ...plateEdge(colors.primaryDark, 3) },
  btn_stop: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.error, ...plateEdge(colors.error, 3) },
  actionText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  actionTextStop: { color: colors.error },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: radius.lg,
    backgroundColor: colors.hazard, alignItems: 'center', justifyContent: 'center',
    ...plateEdge(colors.hazardDark, 4),
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
