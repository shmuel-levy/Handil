import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fontSize, radius, spacing } from '../../constants/theme';
import { HomeStackParamList } from '../../navigation/types';

export type InfoTopic = 'about' | 'support' | 'faq' | 'terms' | 'privacy';

type Section = { heading?: string; body: string };
type Topic = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  intro?: string;
  sections: Section[];
  action?: { label: string; url: string; icon: keyof typeof Ionicons.glyphMap };
};

const SUPPORT_EMAIL = 'support@handil.co.il';

/**
 * Static help content. This used to live inside Alert.alert() calls on the home
 * screen, which capped it at a few lines, made it unscrollable and unselectable,
 * and looked like a placeholder. Real screens can grow without redesign.
 */
export const TOPICS: Record<InfoTopic, Topic> = {
  about: {
    title: 'קצת על הנדיל',
    icon: 'information-circle',
    intro: 'הנדיל מחברת בין דיירים לבעלי מקצוע מנוסים באזור שלהם.',
    sections: [
      {
        heading: 'איך זה עובד',
        body:
          'מפרסמים את העבודה שצריך, בעלי מקצוע באזור שולחים הצעות מחיר, ' +
          'ואתם בוחרים את ההצעה שמתאימה לכם — לפי מחיר, דירוג וזמן הגעה.',
      },
      {
        heading: 'למה אנחנו',
        body:
          'דירוגים אמיתיים מלקוחות שבאמת הזמינו · מחירים שקופים מראש · ' +
          'צ׳אט ישיר עם בעל המקצוע · מעקב אחרי סטטוס העבודה.',
      },
      {
        heading: 'לבעלי מקצוע',
        body:
          'נרשמים בחינם, בוחרים קטגוריות ואזור עבודה, ומקבלים התראות על ' +
          'עבודות רלוונטיות. משלמים רק על מה שסוכם — בלי דמי מנוי.',
      },
    ],
  },

  support: {
    title: 'תמיכה טכנית',
    icon: 'headset',
    intro: 'אנחנו כאן לעזור.',
    sections: [
      { heading: 'שעות פעילות', body: 'ראשון–חמישי, 09:00–17:00' },
      { heading: 'זמן תגובה', body: 'עד יום עסקים אחד.' },
      {
        heading: 'לפני שפונים',
        body:
          'כדאי לבדוק את השאלות הנפוצות — רוב הנושאים מכוסים שם. ' +
          'אם פונים אלינו, ציינו את כתובת האימייל שאיתה נרשמתם.',
      },
    ],
    action: { label: 'שליחת מייל לתמיכה', url: `mailto:${SUPPORT_EMAIL}`, icon: 'mail' },
  },

  faq: {
    title: 'שאלות נפוצות',
    icon: 'help-circle',
    sections: [
      { heading: 'כמה עולה השירות?', body: 'השימוש באפליקציה חינם. כל בעל מקצוע קובע את התעריף שלו, ואתם רואים את המחיר לפני שמאשרים.' },
      { heading: 'איך מבטלים הזמנה?', body: 'מסך "הזמנות" ← בוחרים את ההזמנה ← "בטל הזמנה". ניתן לבטל כל עוד העבודה לא סומנה כהושלמה.' },
      { heading: 'מתי מקבלים הצעות מחיר?', body: 'בדרך כלל תוך שעות ספורות. עבודה שמסומנת כדחופה מוצגת בראש הרשימה של בעלי המקצוע למשך 24 שעות.' },
      { heading: 'איך בוחרים בעל מקצוע?', body: 'במסך ההצעות אפשר למיין לפי מחיר או לפי דירוג, ולראות לכל אחד את הדירוג, מספר הביקורות וזמן התגובה הממוצע.' },
      { heading: 'מה המשמעות של "אומת"?', body: 'תגי האימות הם הצהרה עצמית של בעל המקצוע ואינם מאומתים על ידינו. הסתמכו בעיקר על הדירוג והביקורות מלקוחות קודמים.' },
      { heading: 'איך משנים עיר?', body: 'מסך "פרופיל" ← עריכה ← שדה העיר. העיר משפיעה על העבודות ובעלי המקצוע שמוצגים לכם.' },
    ],
  },

  terms: {
    title: 'תנאי שימוש',
    icon: 'document-text',
    intro: 'עודכן לאחרונה: ספטמבר 2026',
    sections: [
      { heading: 'השירות', body: 'הנדיל היא פלטפורמה המקשרת בין דיירים לבעלי מקצוע עצמאיים. אנחנו איננו צד להתקשרות ביניכם ואיננו מספקים את השירות עצמו.' },
      { heading: 'אחריות', body: 'ההתקשרות, המחיר וביצוע העבודה הם באחריות הצדדים. מומלץ לסכם היקף ומחיר בכתב לפני תחילת העבודה.' },
      { heading: 'התנהלות', body: 'אין לפרסם תוכן פוגעני, מטעה או שאינו קשור לשירותי בית. חשבון שיפר את הכללים עלול להיחסם.' },
      { heading: 'דירוגים', body: 'ניתן לדרג רק עבודות שהושלמו בפועל דרך האפליקציה. דירוגים מזויפים יוסרו.' },
    ],
  },

  privacy: {
    title: 'מדיניות פרטיות',
    icon: 'shield-checkmark',
    intro: 'עודכן לאחרונה: ספטמבר 2026',
    sections: [
      { heading: 'מה אנחנו אוספים', body: 'שם, אימייל, טלפון ועיר — כדי לאפשר יצירת קשר בין הצדדים. וכן פרטי העבודות, ההצעות וההודעות שלכם.' },
      { heading: 'עם מי חולקים', body: 'מספר הטלפון שלכם נחשף לבעל המקצוע רק לאחר שאישרתם את ההצעה שלו. איננו מוכרים מידע לצדדים שלישיים.' },
      { heading: 'אבטחה', body: 'הסיסמאות נשמרות מוצפנות (bcrypt) ולעולם לא בטקסט גלוי. התקשורת מול השרת מוצפנת.' },
      { heading: 'הזכויות שלכם', body: 'ניתן לבקש עיון במידע שלכם, תיקונו או מחיקת החשבון — בפנייה לתמיכה.' },
    ],
  },
};

type Route = RouteProp<HomeStackParamList, 'Info'>;

export default function InfoScreen() {
  const { params } = useRoute<Route>();
  const topic = TOPICS[params.topic];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name={topic.icon} size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>{topic.title}</Text>
          {topic.intro ? <Text style={styles.intro}>{topic.intro}</Text> : null}
        </View>

        {topic.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        {topic.action ? (
          <TouchableOpacity
            style={styles.action}
            onPress={() => Linking.openURL(topic.action!.url)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={topic.action.label}
          >
            <Ionicons name={topic.action.icon} size={18} color={colors.white} />
            <Text style={styles.actionText}>{topic.action.label}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.footer}>הנדיל v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  header: { alignItems: 'center', marginBottom: spacing.xxl },
  iconWrap: {
    width: 64, height: 64, borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.h2, fontWeight: '800',
    color: colors.textPrimary, textAlign: 'center',
  },
  intro: {
    fontSize: fontSize.body, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.sm, lineHeight: 21,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    fontSize: fontSize.bodyLg, fontWeight: '700',
    color: colors.textPrimary, textAlign: 'right', marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.body, color: colors.textSecondary,
    textAlign: 'right', lineHeight: 22,
  },

  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg, borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  actionText: { color: colors.white, fontWeight: '700', fontSize: fontSize.bodyLg },

  footer: {
    textAlign: 'center', color: colors.textDisabled,
    fontSize: fontSize.small, marginTop: spacing.xxl,
  },
});
