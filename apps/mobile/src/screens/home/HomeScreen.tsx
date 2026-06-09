import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkerCard from '../../components/workers/WorkerCard';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { HomeStackParamList } from '../../navigation/types';
import { getWorkers } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { WorkerProfile } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const MENU_ITEMS = [
  { id: 'about',   icon: 'information-circle-outline', title: 'קצת על Handil',    sub: 'הפלטפורמה שמחברת בין דיירים לבעלי מקצוע' },
  { id: 'support', icon: 'headset-outline',            title: 'תמיכה טכנית',      sub: 'זמינים ראשון–חמישי, 09:00–17:00' },
  { id: 'faq',     icon: 'help-circle-outline',        title: 'שאלות נפוצות',     sub: 'תשובות לשאלות הכי נפוצות' },
  { id: 'contact', icon: 'mail-outline',               title: 'צור קשר',          sub: 'support@handil.co.il' },
  { id: 'terms',   icon: 'document-text-outline',      title: 'תנאי שימוש',       sub: 'הסכם שימוש ומדיניות האתר' },
  { id: 'privacy', icon: 'shield-checkmark-outline',   title: 'מדיניות פרטיות',   sub: 'איך אנחנו מגנים על המידע שלך' },
];

function handleMenuAction(id: string) {
  if (id === 'about') {
    Alert.alert('קצת על Handil 🔨', 'Handil מחברת בין דיירים לבעלי מקצוע מנוסים באזורם.\nדירוגים אמיתיים, מחירים שקופים, עבודה מהירה.');
  } else if (id === 'support') {
    Alert.alert('תמיכה טכנית', 'אנחנו זמינים ראשון–חמישי 09:00–17:00.\nשלח מייל ל-support@handil.co.il');
  } else if (id === 'contact') {
    Linking.openURL('mailto:support@handil.co.il');
  } else if (id === 'faq') {
    Alert.alert('שאלות נפוצות', 'Q: כמה עולה השירות?\nA: בעלי מקצוע קובעים את התעריף שלהם.\n\nQ: איך מבטלים הזמנה?\nA: ניתן לבטל מתוך מסך ההזמנות.');
  } else {
    Alert.alert('בקרוב', 'תוכן זה יהיה זמין בקרוב.');
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [topWorkers, setTopWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    getWorkers({ page: 1 })
      .then(({ workers }) => setTopWorkers(workers.slice(0, isDesktop ? 12 : 10)))
      .catch(() => setTopWorkers([]))
      .finally(() => setLoading(false));
  }, [isDesktop]);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const isWorker = user?.role === 'worker';
  const tabNav = navigation.getParent<any>();

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? [] : ['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Desktop hero bar ── */}
        {isDesktop ? (
          <View style={styles.desktopHero}>
            <View>
              <Text style={styles.desktopHeroTitle}>שלום, {firstName} 👋</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={13} color={colors.primary} />
                <Text style={styles.location}>תל אביב</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={styles.desktopSearchBar}
                onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <Text style={styles.searchPlaceholder}>חפשו: חשמלאי, אינסטלטור…</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.desktopMenuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.75}>
                <Ionicons name="menu" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Mobile hero — orange immersive ── */
          <View style={styles.heroMobile}>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroGreeting}>שלום, {firstName} 👋</Text>
                <Text style={styles.heroTagline}>מה צריך לתקן היום?</Text>
              </View>
              <TouchableOpacity style={styles.heroBrand} onPress={() => setMenuOpen(true)} activeOpacity={0.75}>
                <Ionicons name="menu" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroLocation}>תל אביב</Text>
            </View>
            <TouchableOpacity
              style={styles.heroSearch}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
              activeOpacity={0.95}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <Text style={styles.heroSearchText}>חפשו: חשמלאי, אינסטלטור…</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Categories ── */}
        <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
          <Text style={styles.sectionTitle}>קטגוריות</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}>
            <Text style={styles.sectionLink}>הכל</Text>
          </TouchableOpacity>
        </View>

        {isDesktop ? (
          /* Desktop: wrapping pill row — no fixed minWidth so long names fit */
          <View style={styles.categoriesDesktop}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryPillDesktop}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconDesktop}>
                  <Ionicons name={cat.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.categoryNameDesktop}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Mobile: horizontal scroll — no fixed width so text doesn't overflow */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryPill}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={cat.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={styles.categoryName}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Job post action card ── */}
        <View style={[styles.actionRow, isDesktop && styles.actionRowDesktop]}>
          {isWorker ? (
            <TouchableOpacity
              style={[styles.jobCard, isDesktop && styles.jobCardDesktop]}
              onPress={() => tabNav?.navigate('PostsTab')}
              activeOpacity={0.85}
            >
              <View style={styles.jobCardIcon}>
                <Ionicons name="newspaper-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobCardTitle}>עבודות פתוחות</Text>
                <Text style={styles.jobCardSub}>לקוחות מחפשים בעלי מקצוע עכשיו</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.jobCard, styles.jobCardResident, isDesktop && styles.jobCardDesktop]}
              onPress={() => tabNav?.navigate('PostsTab')}
              activeOpacity={0.85}
            >
              <View style={[styles.jobCardIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="create-outline" size={22} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.jobCardTitle, { color: '#92400E' }]}>פרסם עבודה</Text>
                <Text style={styles.jobCardSub}>תאר מה אתה צריך ובעלי מקצוע יפנו אליך</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color="#92400E" />
            </TouchableOpacity>
          )}

          {/* Desktop: banner inline with job card */}
          {isDesktop && (
            <TouchableOpacity
              style={[styles.banner, styles.bannerDesktop]}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
              activeOpacity={0.9}
            >
              <View style={styles.bannerBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.white} />
                <Text style={styles.bannerBadgeText}>בעלי מקצוע מאומתים</Text>
              </View>
              <Text style={styles.bannerTitle}>מצאו מקצוענים{'\n'}לכל עבודה בבית</Text>
              <Text style={styles.bannerSub}>דירוגים אמיתיים · מחירים שקופים</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>לחיפוש</Text>
                <Ionicons name="arrow-back" size={13} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Mobile-only banner ── */}
        {!isDesktop && (
          <View style={styles.banner}>
            <View style={styles.bannerBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.white} />
              <Text style={styles.bannerBadgeText}>בעלי מקצוע מאומתים</Text>
            </View>
            <Text style={styles.bannerTitle}>מצאו מקצוענים{'\n'}לכל עבודה בבית</Text>
            <Text style={styles.bannerSub}>דירוגים אמיתיים · מחירים שקופים</Text>
            <TouchableOpacity
              style={styles.bannerCta}
              onPress={() => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' })}
            >
              <Text style={styles.bannerCtaText}>לחיפוש</Text>
              <Ionicons name="arrow-back" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Top Workers ── */}
        <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
          <Text style={styles.sectionTitle}>בעלי מקצוע מובילים</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : topWorkers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyText}>עדיין אין בעלי מקצוע רשומים</Text>
          </View>
        ) : (
          <View style={isDesktop ? styles.workerGrid : styles.workerList}>
            {topWorkers.map((w) => (
              <WorkerCard
                key={w._id}
                worker={w}
                style={isDesktop ? styles.workerGridCard : undefined}
                onPress={() => navigation.navigate('WorkerDetail', { workerId: w._id, workerName: w.user.name })}
              />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Hamburger side menu ── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          {/* backdrop */}
          <TouchableOpacity style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} activeOpacity={1} />

          {/* panel slides in from right */}
          <View style={styles.menuPanel}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <TouchableOpacity onPress={() => setMenuOpen(false)} style={styles.menuClose}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.menuBrand}>
                <View style={styles.menuBrandIcon}>
                  <Ionicons name="hammer" size={18} color={colors.white} />
                </View>
                <Text style={styles.menuBrandText}>Handil</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* Items */}
            {MENU_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => { setMenuOpen(false); setTimeout(() => handleMenuAction(item.id), 200); }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-back" size={15} color={colors.textDisabled} />
              </TouchableOpacity>
            ))}

            <View style={styles.menuFooter}>
              <Text style={styles.menuVersion}>Handil v1.0.0</Text>
              <Text style={styles.menuTagline}>מחברים אנשים לבעלי מקצוע</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },

  // ── Mobile hero (orange immersive)
  heroMobile: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroGreeting: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'right' },
  heroTagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 2 },
  heroBrand: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginStart: 12,
  },
  heroBrandText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroLocationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 18, justifyContent: 'flex-end',
  },
  heroLocation: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroSearchText: { fontSize: 14, color: colors.textDisabled, flex: 1 },

  // ── Desktop hero
  desktopHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  desktopHeroTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, justifyContent: 'flex-end' },
  location: { fontSize: 13, color: colors.textMuted },
  desktopSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
    minWidth: 320,
  },
  searchPlaceholder: { fontSize: 14, color: colors.textDisabled, flex: 1 },

  // ── Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14, marginTop: 24,
  },
  sectionHeaderDesktop: { paddingHorizontal: 32, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // ── Mobile categories — no fixed width so text fits
  categoriesRow: { paddingHorizontal: 20, gap: 14, paddingBottom: 4 },
  categoryPill: { alignItems: 'center', paddingHorizontal: 2 },
  categoryIcon: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  categoryName: {
    fontSize: 11, fontWeight: '600', color: colors.textSecondary,
    textAlign: 'center', maxWidth: 72,
  },

  // ── Desktop categories — no minWidth so content determines size
  categoriesDesktop: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 32, marginBottom: 24,
  },
  categoryPillDesktop: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  categoryIconDesktop: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  categoryNameDesktop: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  // ── Job card + banner row
  actionRow: { paddingHorizontal: 20, marginBottom: 24, gap: 12 },
  actionRowDesktop: { flexDirection: 'row', paddingHorizontal: 32, gap: 16 },
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  jobCardDesktop: { flex: 1 },
  jobCardResident: { borderColor: '#FDE68A' },
  jobCardIcon: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  jobCardTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'right', marginBottom: 2 },
  jobCardSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right', lineHeight: 18 },

  // ── Banner — orange with white CTA
  banner: {
    marginHorizontal: 20, marginBottom: 28,
    backgroundColor: colors.primary, borderRadius: 20, padding: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  bannerDesktop: { flex: 1, marginHorizontal: 0, marginBottom: 0 },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end', marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  bannerBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  bannerTitle: {
    fontSize: 21, fontWeight: '800', color: colors.white,
    textAlign: 'right', lineHeight: 30, marginBottom: 6,
  },
  bannerSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.75)',
    textAlign: 'right', marginBottom: 18,
  },
  bannerCta: {
    flexDirection: 'row', alignSelf: 'flex-end',
    backgroundColor: colors.white,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, alignItems: 'center', gap: 6,
  },
  bannerCtaText: { color: colors.primary, fontWeight: '800', fontSize: 13 },

  // ── Worker list / grid
  workerList: { paddingHorizontal: 20 },
  workerGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 32, gap: 14 },
  workerGridCard: { flex: 1, minWidth: 280 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: colors.textMuted },

  // Desktop menu button
  desktopMenuBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hamburger modal
  menuOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  menuBackdrop: { flex: 1 },
  menuPanel: {
    width: 290,
    backgroundColor: colors.surface,
    paddingBottom: 40,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  menuClose: { padding: 4 },
  menuBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBrandIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  menuBrandText: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  menuItemIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  menuItemTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  menuItemSub: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  menuFooter: { paddingHorizontal: 20, paddingTop: 24, alignItems: 'flex-end' },
  menuVersion: { fontSize: 12, fontWeight: '600', color: colors.textDisabled },
  menuTagline: { fontSize: 11, color: colors.textDisabled, marginTop: 2 },
});
