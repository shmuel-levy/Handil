import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { getMyWorkerProfile, updateWorkerProfile } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { WorkerProfile } from '../../types';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [city, setCity] = useState('תל אביב');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(user?.role === 'worker');

  useEffect(() => {
    if (user?.role !== 'worker') return;
    getMyWorkerProfile()
      .then(({ worker }) => {
        setWorkerProfile(worker);
        setBio(worker.bio);
        setHourlyRate(worker.hourlyRate ? String(worker.hourlyRate) : '');
        setYearsExp(String(worker.yearsExperience));
        setCity(worker.city);
        setSelectedCats(worker.categories);
        setIsAvailable(worker.isAvailable);
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [user?.role]);

  async function handleSave() {
    setSaving(true);
    try {
      const { worker } = await updateWorkerProfile({
        bio,
        categories: selectedCats,
        city,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        yearsExperience: yearsExp ? Number(yearsExp) : 0,
        isAvailable,
      });
      setWorkerProfile(worker);
      setEditing(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(slug: string) {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function confirmLogout() {
    Alert.alert('יציאה', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.roleBadge, user?.role === 'worker' ? styles.roleBadgeWorker : styles.roleBadgeResident]}>
            <Text style={styles.roleBadgeText}>
              {user?.role === 'worker' ? 'בעל מקצוע' : 'דייר'}
            </Text>
          </View>
        </View>

        {/* Phone */}
        {user?.phone ? (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${user.phone}`)}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>{user.phone}</Text>
            <Text style={styles.callText}>חייג</Text>
          </TouchableOpacity>
        ) : null}

        {/* Worker profile section */}
        {user?.role === 'worker' && (
          <View style={styles.workerSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>פרופיל מקצועי</Text>
              <TouchableOpacity onPress={() => setEditing((e) => !e)} style={styles.editBtn}>
                <Ionicons name={editing ? 'close-outline' : 'pencil-outline'} size={18} color={colors.primary} />
                <Text style={styles.editBtnText}>{editing ? 'ביטול' : 'עריכה'}</Text>
              </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <ActivityIndicator color={colors.primary} />
            ) : editing ? (
              <>
                <Input label="אודות" placeholder="ספרו על עצמכם…" value={bio} onChangeText={setBio} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
                <Input label="עיר" placeholder="תל אביב" value={city} onChangeText={setCity} />
                <Input label="תעריף שעתי (₪)" placeholder="לדוגמה: 150" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" />
                <Input label="שנות ניסיון" placeholder="לדוגמה: 5" value={yearsExp} onChangeText={setYearsExp} keyboardType="numeric" />

                <Text style={styles.fieldLabel}>תחומי עיסוק</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.slug}
                      style={[styles.catChip, selectedCats.includes(cat.slug) && styles.catChipActive]}
                      onPress={() => toggleCategory(cat.slug)}
                    >
                      <Text style={[styles.catChipText, selectedCats.includes(cat.slug) && styles.catChipTextActive]}>
                        {cat.name_he}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.availabilityRow} onPress={() => setIsAvailable((a) => !a)}>
                  <Ionicons
                    name={isAvailable ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isAvailable ? colors.success : colors.textDisabled}
                  />
                  <Text style={styles.availabilityText}>זמין לקבלת עבודות</Text>
                </TouchableOpacity>

                <Button title="שמירת שינויים" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
              </>
            ) : workerProfile ? (
              <View style={styles.profilePreview}>
                {workerProfile.bio ? <Text style={styles.bioText}>{workerProfile.bio}</Text> : null}
                <View style={styles.statsRow}>
                  <StatItem label="דירוג" value={workerProfile.rating > 0 ? workerProfile.rating.toFixed(1) : '—'} icon="star-outline" />
                  <StatItem label="ביקורות" value={String(workerProfile.reviewCount)} icon="chatbubble-outline" />
                  <StatItem label="ניסיון" value={workerProfile.yearsExperience > 0 ? `${workerProfile.yearsExperience} שנ'` : '—'} icon="briefcase-outline" />
                </View>
              </View>
            ) : (
              <Text style={styles.noProfileText}>לא הגדרתם פרופיל מקצועי עדיין. לחצו על עריכה.</Text>
            )}
          </View>
        )}

        <Button
          title="התנתקות"
          variant="outline"
          onPress={confirmLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.white },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textMuted, marginBottom: 10 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  roleBadgeWorker: { backgroundColor: colors.primaryLight },
  roleBadgeResident: { backgroundColor: colors.successLight },
  roleBadgeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: { fontSize: 14, color: colors.textSecondary, flex: 1, textAlign: 'right' },
  callText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  workerSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  catChipTextActive: { color: colors.primary },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  availabilityText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  profilePreview: {},
  bioText: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 22, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  noProfileText: { fontSize: 13, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  logoutBtn: { marginTop: 8 },
});
