import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { getMyWorkerProfile, getWorker, updateWorkerProfile } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { WorkerProfile, WorkerStats } from '../../types';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [city, setCity] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);

  useEffect(() => {
    if (user?.role !== 'worker') return;
    getMyWorkerProfile()
      .then(({ worker }) => {
        setWorkerProfile(worker);
        setBio(worker.bio ?? '');
        setHourlyRate(worker.hourlyRate ? String(worker.hourlyRate) : '');
        setYearsExp(worker.yearsExperience ? String(worker.yearsExperience) : '');
        setCity(worker.city ?? '');
        setSelectedCats(worker.categories ?? []);
        setIsAvailable(worker.isAvailable ?? true);
        // Load reliability stats
        getWorker(worker._id)
          .then(({ stats }) => setWorkerStats(stats))
          .catch(() => {});
      })
      .catch(() => {});
  }, [user?.role]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לתמונות בהגדרות');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

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
    setConfirmLogoutVisible(true);
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  const isWorker = user?.role === 'worker';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Hero header ── */}
        <View style={styles.hero}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraBtn} onPress={pickPhoto} activeOpacity={0.85}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{user?.name}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>

          <View style={[styles.rolePill, isWorker ? styles.rolePillWorker : styles.rolePillResident]}>
            <Ionicons
              name={isWorker ? 'construct' : 'home'}
              size={12}
              color={isWorker ? colors.primary : colors.success}
            />
            <Text style={[styles.rolePillText, isWorker ? { color: colors.primary } : { color: colors.success }]}>
              {isWorker ? 'בעל מקצוע' : 'דייר'}
            </Text>
          </View>
        </View>

        {/* ── Worker stats ── */}
        {isWorker && workerProfile && (
          <View style={styles.statsRow}>
            <StatCard
              icon="star"
              iconColor={colors.star}
              value={workerProfile.rating > 0 ? workerProfile.rating.toFixed(1) : '—'}
              label="דירוג"
            />
            <View style={styles.statDivider} />
            <StatCard
              icon="chatbubble-ellipses"
              iconColor="#8B5CF6"
              value={String(workerProfile.reviewCount ?? 0)}
              label="ביקורות"
            />
            <View style={styles.statDivider} />
            <StatCard
              icon="briefcase"
              iconColor={colors.primary}
              value={workerProfile.yearsExperience > 0 ? `${workerProfile.yearsExperience}` : '—'}
              label="שנות ניסיון"
            />
          </View>
        )}

        {/* ── Reliability stats dashboard ── */}
        {isWorker && workerStats && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>דשבורד ביצועים</Text>
            </View>

            <View style={styles.dashGrid}>
              <DashCell
                icon="checkmark-done-circle"
                iconColor={colors.success}
                value={String(workerStats.totalJobsDone)}
                label="עבודות שהושלמו"
              />
              <DashCell
                icon="trending-up"
                iconColor="#8B5CF6"
                value={workerStats.completionRate !== null ? `${workerStats.completionRate}%` : '—'}
                label="אחוז השלמה"
              />
              <DashCell
                icon="thumbs-up"
                iconColor={colors.star}
                value={workerStats.quoteAcceptRate !== null ? `${workerStats.quoteAcceptRate}%` : '—'}
                label="הצעות שאושרו"
              />
              <DashCell
                icon="time"
                iconColor={colors.primary}
                value={workerStats.avgResponseHours !== null ? `${workerStats.avgResponseHours.toFixed(1)}ש׳` : '—'}
                label="זמן תגובה ממוצע"
              />
            </View>
          </View>
        )}

        {/* ── About / Bio (view mode) ── */}
        {isWorker && !editing && workerProfile?.bio ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>קצת עליי</Text>
            </View>
            <Text style={styles.bioText}>{workerProfile.bio}</Text>
          </View>
        ) : null}

        {/* ── Worker info card (view mode) ── */}
        {isWorker && !editing && workerProfile && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>פרטי מקצוע</Text>
              <TouchableOpacity style={styles.editLink} onPress={() => setEditing(true)}>
                <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                <Text style={styles.editLinkText}>עריכה</Text>
              </TouchableOpacity>
            </View>

            {workerProfile.city ? (
              <View style={styles.infoLine}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text style={styles.infoLineText}>{workerProfile.city}</Text>
              </View>
            ) : null}

            {workerProfile.hourlyRate ? (
              <View style={styles.infoLine}>
                <Ionicons name="cash-outline" size={15} color={colors.textMuted} />
                <Text style={styles.infoLineText}>₪{workerProfile.hourlyRate} לשעה</Text>
              </View>
            ) : null}

            <View style={styles.infoLine}>
              <Ionicons
                name={workerProfile.isAvailable ? 'checkmark-circle' : 'close-circle-outline'}
                size={15}
                color={workerProfile.isAvailable ? colors.success : colors.textDisabled}
              />
              <Text style={[styles.infoLineText, { color: workerProfile.isAvailable ? colors.success : colors.textMuted }]}>
                {workerProfile.isAvailable ? 'זמין לעבודה' : 'לא זמין כרגע'}
              </Text>
            </View>

            {(workerProfile.categories ?? []).length > 0 && (
              <View style={styles.catWrap}>
                {(workerProfile.categories ?? []).slice(0, 5).map((slug) => {
                  const cat = CATEGORIES.find((c) => c.slug === slug);
                  return cat ? (
                    <View key={slug} style={styles.catTag}>
                      <Ionicons name={cat.icon as any} size={11} color={colors.primary} />
                      <Text style={styles.catTagText}>{cat.name_he}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Edit form ── */}
        {isWorker && editing && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>עריכת פרופיל</Text>
              <TouchableOpacity style={styles.editLink} onPress={() => setEditing(false)}>
                <Ionicons name="close-outline" size={17} color={colors.textMuted} />
                <Text style={[styles.editLinkText, { color: colors.textMuted }]}>ביטול</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="קצת עליי"
              placeholder="ספרו על עצמכם, הניסיון שלכם והתמחויות…"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={{ height: 88, textAlignVertical: 'top' }}
            />
            <Input label="עיר" placeholder="תל אביב" value={city} onChangeText={setCity} />
            <Input
              label="תעריף שעתי (₪)"
              placeholder="לדוגמה: 150"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="numeric"
            />
            <Input
              label="שנות ניסיון"
              placeholder="לדוגמה: 5"
              value={yearsExp}
              onChangeText={setYearsExp}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>תחומי עיסוק</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => {
                const active = selectedCats.includes(cat.slug);
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => toggleCategory(cat.slug)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={cat.icon as any} size={13} color={active ? colors.white : colors.primary} />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.name_he}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.availabilityRow} onPress={() => setIsAvailable((a) => !a)}>
              <Ionicons
                name={isAvailable ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isAvailable ? colors.success : colors.textDisabled}
              />
              <Text style={styles.availabilityText}>זמין לקבלת עבודות</Text>
            </TouchableOpacity>

            <Button title="שמירת שינויים" onPress={handleSave} loading={saving} style={{ marginTop: 4 }} />
          </View>
        )}

        {/* ── Settings items ── */}
        <View style={styles.settingsCard}>
          {user?.phone ? (
            <SettingRow
              icon="call-outline"
              title="טלפון"
              subtitle={user.phone}
              onPress={() => Linking.openURL(`tel:${user.phone}`)}
              accent
            />
          ) : null}

          <SettingRow
            icon="help-circle-outline"
            title="תמיכה ועזרה"
            subtitle="support@handil.co.il"
            onPress={() => Linking.openURL('mailto:support@handil.co.il')}
          />

          <SettingRow
            icon="shield-checkmark-outline"
            title="מדיניות פרטיות"
            subtitle="איך אנחנו מגנים על המידע שלך"
            onPress={() => Alert.alert('בקרוב', 'מדיניות הפרטיות תהיה זמינה בקרוב.')}
          />

          <SettingRow
            icon="document-text-outline"
            title="תנאי שימוש"
            subtitle="הסכם שימוש ותנאי השירות"
            onPress={() => Alert.alert('בקרוב', 'תנאי השימוש יהיו זמינים בקרוב.')}
            last
          />
        </View>

        {/* ── Logout ── */}
        {confirmLogoutVisible ? (
          <View style={styles.logoutConfirm}>
            <Text style={styles.logoutConfirmText}>האם אתה בטוח שברצונך להתנתק?</Text>
            <View style={styles.logoutConfirmBtns}>
              <TouchableOpacity style={styles.logoutConfirmYes} onPress={() => logout()} activeOpacity={0.85}>
                <Text style={styles.logoutConfirmYesText}>כן, התנתק</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmNo} onPress={() => setConfirmLogoutVisible(false)} activeOpacity={0.85}>
                <Text style={styles.logoutConfirmNoText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.logoutText}>התנתקות</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconColor, value, label }: { icon: string; iconColor: string; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={18} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DashCell({ icon, iconColor, value, label }: { icon: string; iconColor: string; value: string; label: string }) {
  return (
    <View style={styles.dashCell}>
      <View style={[styles.dashIconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.dashValue}>{value}</Text>
      <Text style={styles.dashLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon, title, subtitle, onPress, accent, last,
}: {
  icon: string; title: string; subtitle: string;
  onPress?: () => void; accent?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIconWrap, accent && { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon as any} size={19} color={accent ? colors.primary : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-back" size={14} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },

  // ── Hero
  hero: {
    backgroundColor: colors.primary, alignItems: 'center',
    paddingTop: 32, paddingBottom: 36, paddingHorizontal: 24,
  },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 38, fontWeight: '800', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 0, left: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primaryDark,
    borderWidth: 2.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  rolePillWorker: { backgroundColor: 'rgba(255,255,255,0.9)' },
  rolePillResident: { backgroundColor: 'rgba(255,255,255,0.9)' },
  rolePillText: { fontSize: 13, fontWeight: '700' },

  // ── Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    marginHorizontal: 20, marginTop: -20, borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  // ── Cards
  card: {
    backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 18, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'right' },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  bioText: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 23 },

  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'flex-end' },
  infoLineText: { fontSize: 14, color: colors.textSecondary, textAlign: 'right' },

  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10, justifyContent: 'flex-end' },
  catTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  catTagText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // Edit form fields
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'right', marginBottom: 8, marginTop: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.background,
  },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  catChipTextActive: { color: colors.white },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  availabilityText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },

  // ── Dash grid
  dashGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  dashCell: {
    width: '47%', alignItems: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  dashIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dashValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  dashLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  // ── Settings
  settingsCard: {
    backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 18,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  settingTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  settingSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },

  // ── Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, paddingVertical: 15, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.error + '60',
    backgroundColor: colors.errorLight,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.error },
  logoutConfirm: {
    marginHorizontal: 20, padding: 18, borderRadius: 16,
    backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error + '40',
    gap: 14,
  },
  logoutConfirmText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  logoutConfirmBtns: { flexDirection: 'row', gap: 10 },
  logoutConfirmYes: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.error,
  },
  logoutConfirmYesText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  logoutConfirmNo: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
  },
  logoutConfirmNoText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
