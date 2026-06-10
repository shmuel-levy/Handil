import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryBySlug } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { getMyBookings, updateBookingStatus } from '../../services/bookingsApi';
import { useAuthStore } from '../../store/authStore';
import { Booking } from '../../types';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'ממתין',   color: colors.warning,  bg: colors.warningLight },
  accepted:  { label: 'אושר',    color: colors.success,  bg: colors.successLight },
  rejected:  { label: 'נדחה',    color: colors.error,    bg: colors.errorLight },
  completed: { label: 'הושלם',   color: colors.primary,  bg: colors.primaryLight },
  cancelled: { label: 'בוטל',    color: colors.textMuted, bg: colors.borderLight },
};

export default function BookingsScreen() {
  const user = useAuthStore((s) => s.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const { bookings: data } = await getMyBookings();
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAction(bookingId: string, status: 'accepted' | 'rejected' | 'completed' | 'cancelled') {
    try {
      const { booking } = await updateBookingStatus(bookingId, status);
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? booking : b)));
    } catch {
      // silent fail — refresh will correct state
    }
  }

  function renderActions(booking: Booking) {
    if (booking.status !== 'pending' && booking.status !== 'accepted') return null;
    const isWorker = user?.role === 'worker';
    const isResident = user?.role === 'resident';

    return (
      <View style={styles.actionsRow}>
        {isWorker && booking.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAction(booking._id, 'accepted')}
            >
              <Text style={styles.acceptBtnText}>קבל</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleAction(booking._id, 'rejected')}
            >
              <Text style={styles.rejectBtnText}>דחה</Text>
            </TouchableOpacity>
          </>
        )}
        {isWorker && booking.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.completeBtn]}
            onPress={() => handleAction(booking._id, 'completed')}
          >
            <Text style={styles.acceptBtnText}>סמן כהושלם</Text>
          </TouchableOpacity>
        )}
        {isResident && booking.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleAction(booking._id, 'cancelled')}
          >
            <Text style={styles.rejectBtnText}>בטל הזמנה</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
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
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{otherParty?.name?.charAt(0) ?? '?'}</Text>
                    </View>
                    <View>
                      <Text style={styles.partyName}>{otherParty?.name}</Text>
                      <Text style={styles.categoryText}>{cat?.name_he ?? item.category}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString('he-IL', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>

                {renderActions(item)}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={56} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>אין הזמנות עדיין</Text>
              <Text style={styles.emptySub}>
                {user?.role === 'resident'
                  ? 'חפשו בעל מקצוע ושלחו בקשת הזמנה'
                  : 'הזמנות מלקוחות יופיעו כאן'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  partyName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  categoryText: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 13, color: colors.textSecondary, textAlign: 'right', marginBottom: 8, lineHeight: 20 },
  dateText: { fontSize: 11, color: colors.textDisabled, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  acceptBtn: { backgroundColor: colors.success },
  completeBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error },
  acceptBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  rejectBtnText: { color: colors.error, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
