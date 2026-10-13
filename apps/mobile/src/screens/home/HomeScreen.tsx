import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonList } from '../../components/common/Skeleton';
import BlueprintGrid from '../../components/site/BlueprintGrid';
import HazardStripe from '../../components/site/HazardStripe';
import SectionHeader from '../../components/site/SectionHeader';
import WorkerCard from '../../components/workers/WorkerCard';
import { CATEGORIES } from '../../constants/categories';
import { colors } from '../../constants/colors';
import { monoFont, plateEdge, radius } from '../../constants/theme';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { HomeStackParamList } from '../../navigation/types';
import { getWorkers } from '../../services/workersApi';
import { useAuthStore } from '../../store/authStore';
import { WorkerProfile } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const MENU_ITEMS = [
  { id: 'about',   icon: 'information-circle-outline', title: 'קצת על הנדיל',    sub: 'הפלטפורמה שמחברת בין דיירים לבעלי מקצוע' },
  { id: 'support', icon: 'headset-outline',            title: 'תמיכה טכנית',      sub: 'זמינים ראשון–חמישי, 09:00–17:00' },
  { id: 'faq',     icon: 'help-circle-outline',        title: 'שאלות נפוצות',     sub: 'תשובות לשאלות הכי נפוצות' },
  { id: 'contact', icon: 'mail-outline',               title: 'צור קשר',          sub: 'support@handil.co.il' },
  { id: 'terms',   icon: 'document-text-outline',      title: 'תנאי שימוש',       sub: 'הסכם שימוש ומדיניות האתר' },
  { id: 'privacy', icon: 'shield-checkmark-outline',   title: 'מדיניות פרטיות',   sub: 'איך אנחנו מגנים על המידע שלך' },
];

/** Menu ids that open a real content screen rather than a mailto: link. */
const INFO_TOPICS = ['about', 'support', 'faq', 'terms', 'privacy'] as const;
type InfoTopicId = (typeof INFO_TOPICS)[number];

function isInfoTopic(id: string): id is InfoTopicId {
  return (INFO_TOPICS as readonly string[]).includes(id);
}

/** The three promises, shown as spec lines on the hero. */
const SPECS = [
  { icon: 'star', label: 'דירוגים אמיתיים' },
  { icon: 'pricetag', label: 'מחיר שקוף מראש' },
  { icon: 'flash', label: 'מענה מהיר' },
] as const;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [topWorkers, setTopWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const panelAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const { isDesktop } = useBreakpoint();

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(panelAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(panelAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  useEffect(() => {
    getWorkers({ page: 1 })
      .then(({ workers }) => setTopWorkers(workers.slice(0, 12)))
      .catch(() => setTopWorkers([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const isWorker = user?.role === 'worker';
  const tabNav = navigation.getParent<any>();
  const openAll = () => navigation.navigate('WorkerList', { category: '', categoryName: 'כל בעלי המקצוע' });
  const gutter = isDesktop ? styles.gutterDesktop : styles.gutter;

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? [] : ['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero: asphalt + blueprint grid, finished with hazard tape ── */}
        <View style={styles.hero}>
          <BlueprintGrid />
          <View style={[styles.heroInner, isDesktop && styles.heroInnerDesktop]}>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.siteLabel}>
                  <Ionicons name="location" size={11} color={colors.asphalt} />
                  <Text style={styles.siteLabelText}>{user?.city || 'תל אביב'}</Text>
                </View>
                <Text style={styles.heroGreeting}>שלום, {firstName}</Text>
                <Text style={styles.heroTagline}>
                  {isWorker ? 'מה עולה היום על הפיגום?' : 'מה צריך לתקן היום?'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={openMenu}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="תפריט"
              >
                <Ionicons name="menu" size={24} color={colors.onAsphalt} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.heroSearch, isDesktop && styles.heroSearchDesktop]}
              onPress={openAll}
              activeOpacity={0.95}
              accessibilityRole="search"
              accessibilityLabel="חיפוש בעל מקצוע"
            >
              <Text style={styles.heroSearchText}>חפשו: חשמלאי, אינסטלטור, צבעי…</Text>
              <View style={styles.heroSearchBtn}>
                <Ionicons name="search" size={18} color={colors.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.specRow}>
              {SPECS.map((s) => (
                <View key={s.label} style={styles.spec}>
                  <Ionicons name={s.icon} size={12} color={colors.hazard} />
                  <Text style={styles.specText}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <HazardStripe height={10} stripe={14} />
        </View>

        {/* ── Categories as toolbox tiles ── */}
        <SectionHeader
          title="ארגז הכלים"
          actionLabel="הכל"
          onAction={openAll}
          style={{ ...gutter, marginTop: 26, marginBottom: 14 }}
        />

        {isDesktop ? (
          <View style={[styles.tileGrid, gutter]}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.tileDesktop}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={cat.name_he}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={cat.icon as any} size={20} color={colors.asphalt} />
                </View>
                <Text style={styles.tileNameDesktop} numberOfLines={1}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.tile}
                onPress={() => navigation.navigate('WorkerList', { category: cat.slug, categoryName: cat.name_he })}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={cat.name_he}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={cat.icon as any} size={24} color={colors.asphalt} />
                </View>
                <Text style={styles.tileName} numberOfLines={2}>{cat.name_he}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Work order card + promo ── */}
        <View style={[styles.actionRow, gutter, isDesktop && styles.actionRowDesktop]}>
          <TouchableOpacity
            style={[styles.orderCard, isDesktop && { flex: 1 }]}
            onPress={() => tabNav?.navigate('PostsTab')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={isWorker ? 'עבודות פתוחות' : 'פרסם עבודה'}
          >
            <View style={styles.orderHead}>
              <Text style={styles.orderHeadText}>{isWorker ? 'לוח עבודות' : 'הזמנת עבודה חדשה'}</Text>
              <Text style={styles.orderHeadNo}>{isWorker ? 'LIVE' : 'WO-NEW'}</Text>
            </View>
            <View style={styles.orderBody}>
              <View style={styles.orderIcon}>
                <Ionicons
                  name={isWorker ? 'clipboard' : 'create'}
                  size={22}
                  color={colors.white}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>{isWorker ? 'עבודות פתוחות' : 'פרסם עבודה'}</Text>
                <Text style={styles.orderSub}>
                  {isWorker ? 'לקוחות מחפשים בעלי מקצוע עכשיו' : 'תאר מה צריך — בעלי מקצוע ישלחו הצעות מחיר'}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.promo, isDesktop && { flex: 1 }]}
            onPress={openAll}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="מצאו מקצוענים לכל עבודה בבית"
          >
            <HazardStripe height={8} stripe={10} />
            <View style={styles.promoInner}>
              <View style={styles.promoBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.hazard} />
                <Text style={styles.promoBadgeText}>בעלי מקצוע עם דירוג אמיתי</Text>
              </View>
              <Text style={styles.promoTitle}>מצאו מקצוען{'\n'}לכל עבודה בבית</Text>
              <View style={styles.promoCta}>
                <Text style={styles.promoCtaText}>לחיפוש</Text>
                <Ionicons name="arrow-back" size={14} color={colors.hazard} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Top workers ── */}
        <SectionHeader title="המקצוענים המובילים" style={{ ...gutter, marginBottom: 14 }} />

        {loading ? (
          <SkeletonList count={3} variant="worker" />
        ) : topWorkers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="construct-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyText}>עדיין אין בעלי מקצוע רשומים</Text>
          </View>
        ) : (
          <View style={isDesktop ? [styles.workerGrid, gutter] : gutter}>
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

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Side menu (slides in from the right) ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={closeMenu} activeOpacity={1} accessibilityLabel="סגירת התפריט" />
          </Animated.View>

          <Animated.View style={[styles.menuPanel, { transform: [{ translateX: panelAnim }] }]}>
            <View style={styles.menuHeader}>
              <BlueprintGrid cell={20} />
              <View style={styles.menuHeaderRow}>
                <TouchableOpacity
                  onPress={closeMenu}
                  style={styles.menuClose}
                  accessibilityRole="button"
                  accessibilityLabel="סגירה"
                >
                  <Ionicons name="close" size={22} color={colors.onAsphalt} />
                </TouchableOpacity>
                <View style={styles.menuBrand}>
                  <View style={styles.menuBrandIcon}>
                    <Ionicons name="construct" size={18} color={colors.asphalt} />
                  </View>
                  <Text style={styles.menuBrandText}>הנדיל</Text>
                </View>
              </View>
            </View>
            <HazardStripe height={6} stripe={9} />

            {MENU_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  closeMenu();
                  setTimeout(() => {
                    if (isInfoTopic(item.id)) navigation.navigate('Info', { topic: item.id });
                    else if (item.id === 'contact') Linking.openURL('mailto:support@handil.co.il');
                  }, 250);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name={item.icon as any} size={19} color={colors.asphalt} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-back" size={15} color={colors.textDisabled} />
              </TouchableOpacity>
            ))}

            <View style={styles.menuFooter}>
              <Text style={styles.menuVersion}>HANDIL · v1.0.0</Text>
              <Text style={styles.menuTagline}>מחברים אנשים לבעלי מקצוע</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.asphalt },
  scroll: { flex: 1, backgroundColor: colors.background },
  gutter: { paddingHorizontal: 20 },
  gutterDesktop: { paddingHorizontal: 32 },

  // ── Hero
  hero: { backgroundColor: colors.asphalt, overflow: 'hidden' },
  heroInner: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 },
  heroInnerDesktop: { paddingHorizontal: 32, paddingTop: 30, paddingBottom: 30 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  siteLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: colors.hazard, borderRadius: radius.sm,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 10,
  },
  siteLabelText: { fontSize: 11, fontWeight: '800', color: colors.asphalt },
  heroGreeting: { fontSize: 28, fontWeight: '900', color: colors.onAsphalt, textAlign: 'right', letterSpacing: -0.5 },
  heroTagline: { fontSize: 15, color: colors.onAsphaltMuted, textAlign: 'right', marginTop: 2 },
  menuBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.asphaltSoft,
    borderWidth: 1, borderColor: colors.asphaltLine,
    alignItems: 'center', justifyContent: 'center',
    marginStart: 12,
  },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingStart: 16, padding: 5, gap: 10,
    ...plateEdge(colors.primary, 3),
  },
  heroSearchDesktop: { maxWidth: 620 },
  heroSearchText: { fontSize: 14, color: colors.textMuted, flex: 1 },
  heroSearchBtn: {
    width: 42, height: 42, borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  specText: { fontSize: 12, fontWeight: '700', color: colors.onAsphalt },

  // ── Category tiles
  tileRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 6 },
  tile: {
    width: 84, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 6,
    ...plateEdge(colors.border, 3),
  },
  tileIcon: {
    width: 46, height: 46, borderRadius: radius.md,
    backgroundColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    ...plateEdge(colors.hazardDark, 3),
  },
  tileName: {
    fontSize: 11, fontWeight: '800', color: colors.textSecondary,
    textAlign: 'center', lineHeight: 14,
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileDesktop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingStart: 6, paddingEnd: 14, paddingVertical: 6,
    ...plateEdge(colors.border, 3),
  },
  tileNameDesktop: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },

  // ── Work order + promo
  actionRow: { marginTop: 24, marginBottom: 28, gap: 14 },
  actionRowDesktop: { flexDirection: 'row', gap: 16 },
  orderCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.asphalt,
    overflow: 'hidden',
    ...plateEdge(colors.asphalt, 4),
  },
  orderHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.asphalt, paddingHorizontal: 14, paddingVertical: 7,
  },
  orderHeadText: { fontSize: 12, fontWeight: '800', color: colors.onAsphalt },
  orderHeadNo: { fontFamily: monoFont, fontSize: 11, fontWeight: '700', color: colors.hazard, letterSpacing: 1 },
  orderBody: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  orderIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    ...plateEdge(colors.primaryDark, 3),
  },
  orderTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  orderSub: { fontSize: 12, color: colors.textMuted, textAlign: 'right', lineHeight: 18 },

  promo: { backgroundColor: colors.asphalt, borderRadius: radius.lg, overflow: 'hidden' },
  promoInner: { padding: 20 },
  promoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.asphaltLine, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12,
  },
  promoBadgeText: { fontSize: 11, fontWeight: '700', color: colors.onAsphalt },
  promoTitle: {
    fontSize: 22, fontWeight: '900', color: colors.onAsphalt,
    textAlign: 'right', lineHeight: 30, marginBottom: 16,
  },
  promoCta: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: colors.hazard, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  promoCtaText: { color: colors.hazard, fontWeight: '900', fontSize: 14 },

  // ── Workers
  workerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  workerGridCard: { flex: 1, minWidth: 280 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: colors.textMuted },

  // ── Side menu
  menuPanel: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: 300,
    backgroundColor: colors.surface,
    paddingBottom: 40,
  },
  menuHeader: { backgroundColor: colors.asphalt, overflow: 'hidden' },
  menuHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18,
  },
  menuClose: { padding: 6 },
  menuBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBrandIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.hazard, alignItems: 'center', justifyContent: 'center',
  },
  menuBrandText: { fontSize: 20, fontWeight: '900', color: colors.onAsphalt },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  menuItemIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.hazardLight, borderWidth: 1, borderColor: colors.hazard,
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  menuItemSub: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  menuFooter: { paddingHorizontal: 20, paddingTop: 24, alignItems: 'flex-end' },
  menuVersion: { fontFamily: monoFont, fontSize: 11, fontWeight: '700', color: colors.textDisabled, letterSpacing: 1 },
  menuTagline: { fontSize: 11, color: colors.textDisabled, marginTop: 2 },
});
