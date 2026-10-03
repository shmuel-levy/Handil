/**
 * Request schemas shared by the API (server-side validation) and the mobile
 * client (form validation before a round trip).
 *
 * The Hebrew messages here ARE the API contract — the mobile app and the test
 * suite both assert on them, so changing a string is a breaking change.
 */
const { z } = require('zod');
const C = require('./constants');

// ─── helpers ──────────────────────────────────────────────────────────────────

/** A required non-empty string that reports one shared "missing fields" message. */
function requiredString(message, { max } = {}) {
  let s = z.string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);
  if (max) s = s.max(max, `הטקסט ארוך מדי (מקסימום ${max} תווים)`);
  return s;
}

/** MongoDB ObjectId, or any non-empty id string the route will look up itself. */
function objectId(message) {
  return z.string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);
}

/**
 * Rough byte size of a data: URI or plain string.
 * base64 encodes 3 bytes as 4 characters.
 */
function approximateBytes(value) {
  if (typeof value !== 'string') return 0;
  const comma = value.indexOf(',');
  const payload = value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value;
  return Math.floor((payload.length * 3) / 4);
}

const imageString = z.string().refine(
  (v) => approximateBytes(v) <= C.MAX_IMAGE_BYTES,
  { message: `תמונה גדולה מדי (מקסימום ${Math.round(C.MAX_IMAGE_BYTES / 1024 / 1024)}MB לתמונה)` }
);

// ─── auth ─────────────────────────────────────────────────────────────────────

const MISSING_FIELDS = 'שדות חובה חסרים';

const registerSchema = z.object({
  name:  requiredString(MISSING_FIELDS, { max: 80 }),
  email: z.string({ required_error: MISSING_FIELDS, invalid_type_error: MISSING_FIELDS })
    .trim()
    .min(1, MISSING_FIELDS)
    .email('כתובת אימייל לא תקינה')
    .toLowerCase(),
  // Declared before `password` so an invalid role is reported first, matching
  // the order the original hand-written checks ran in.
  role: z.enum(C.ROLES, {
    required_error: MISSING_FIELDS,
    invalid_type_error: 'תפקיד לא חוקי',
    message: 'תפקיד לא חוקי',
  }),
  password: z.string({ required_error: MISSING_FIELDS, invalid_type_error: MISSING_FIELDS })
    .min(1, MISSING_FIELDS)
    .min(C.PASSWORD_MIN_LENGTH, `הסיסמה חייבת להיות לפחות ${C.PASSWORD_MIN_LENGTH} תווים`)
    .max(128, 'הסיסמה ארוכה מדי'),
  phone: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email:    requiredString('נא להזין אימייל וסיסמה').toLowerCase(),
  password: z.string({ required_error: 'נא להזין אימייל וסיסמה', invalid_type_error: 'נא להזין אימייל וסיסמה' })
    .min(1, 'נא להזין אימייל וסיסמה'),
});

const updateProfileSchema = z.object({
  name:   z.string().trim().min(1, 'השם לא יכול להיות ריק').max(80).optional(),
  phone:  z.string().trim().max(30).optional(),
  city:   z.string().trim().max(80).optional(),
  avatar: imageString
    .refine((v) => approximateBytes(v) <= C.MAX_AVATAR_BYTES, {
      message: `תמונת הפרופיל גדולה מדי (מקסימום ${Math.round(C.MAX_AVATAR_BYTES / 1024 / 1024)}MB)`,
    })
    .optional(),
  preferredCategories: z.array(z.string()).max(12).optional(),
});

// ─── job posts ────────────────────────────────────────────────────────────────

const POST_REQUIRED = 'כותרת וקטגוריה הם שדות חובה';

const createPostSchema = z.object({
  title:       requiredString(POST_REQUIRED, { max: C.POST_TITLE_MAX }),
  category:    requiredString(POST_REQUIRED),
  description: z.string().trim().max(C.POST_DESCRIPTION_MAX, 'התיאור ארוך מדי').optional(),
  budget:      z.coerce.number().min(0, 'תקציב לא יכול להיות שלילי').nullable().optional(),
  urgency:     z.enum(C.URGENCY_LEVELS, { message: 'רמת דחיפות לא תקינה' }).optional(),
  location:    z.string().trim().max(80).optional(),
  images: z.array(imageString)
    .max(C.MAX_POST_IMAGES, `ניתן לצרף עד ${C.MAX_POST_IMAGES} תמונות`)
    .optional(),
});

// ─── quotes ───────────────────────────────────────────────────────────────────

const QUOTE_REQUIRED = 'חסרים שדות חובה';

const createQuoteSchema = z.object({
  jobPostId:     objectId(QUOTE_REQUIRED),
  // Deliberately not `.positive()` — a ₪0 "no charge" quote is legitimate.
  proposedPrice: z.coerce.number({ required_error: QUOTE_REQUIRED, invalid_type_error: QUOTE_REQUIRED })
    .min(0, 'המחיר לא יכול להיות שלילי')
    .max(1_000_000, 'המחיר גבוה מדי'),
  message:              z.string().trim().max(1000, 'ההודעה ארוכה מדי').optional(),
  estimatedArrivalDate: z.string().trim().optional(),
});

// ─── bookings ─────────────────────────────────────────────────────────────────

const createBookingSchema = z.object({
  workerUserId:  objectId(MISSING_FIELDS),
  category:      requiredString(MISSING_FIELDS),
  description:   z.string().trim().max(1000).optional(),
  scheduledDate: z.string().trim().nullable().optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(C.BOOKING_STATUSES, { message: 'סטטוס לא תקין' }),
});

// ─── reviews ──────────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  bookingId: objectId(MISSING_FIELDS),
  rating: z.coerce.number({ required_error: MISSING_FIELDS, invalid_type_error: MISSING_FIELDS })
    .int('הדירוג חייב להיות מספר שלם')
    .min(1, 'הדירוג חייב להיות בין 1 ל-5')
    .max(5, 'הדירוג חייב להיות בין 1 ל-5'),
  comment: z.string().trim().max(1000, 'הביקורת ארוכה מדי').optional(),
});

// ─── workers ──────────────────────────────────────────────────────────────────

const rateField = z.coerce.number().min(0, 'תעריף לא יכול להיות שלילי').max(100_000).nullable().optional();

const updateWorkerSchema = z.object({
  bio:             z.string().trim().max(1000, 'הביוגרפיה ארוכה מדי').optional(),
  categories:      z.array(z.string()).max(12, 'ניתן לבחור עד 12 קטגוריות').optional(),
  city:            z.string().trim().max(80).optional(),
  yearsExperience: z.coerce.number().min(0, 'שנות ניסיון לא יכולות להיות שליליות').max(80).optional(),
  hourlyRate:      rateField,
  isAvailable:     z.boolean().optional(),
  urgencyRates: z.object({
    urgent: rateField, today: rateField, week: rateField, flexible: rateField,
  }).partial().optional(),
  offersTeaching: z.boolean().optional(),
  teachingRate:   rateField,
});

const availabilitySchema = z.object({
  isAvailable: z.boolean({
    required_error: 'חסר isAvailable',
    invalid_type_error: 'חסר isAvailable',
  }),
});

const verifyBadgeSchema = z.object({
  badge: z.enum(C.VERIFICATION_BADGES, {
    required_error: 'תג לא תקין',
    invalid_type_error: 'תג לא תקין',
    message: 'תג לא תקין',
  }),
});

const portfolioItemSchema = z.object({
  title:       requiredString('כותרת נדרשת', { max: 120 }),
  description: z.string().trim().max(500).optional(),
  beforeImage: imageString.optional(),
  afterImage:  imageString.optional(),
  category:    z.string().trim().optional(),
});

// ─── chat ─────────────────────────────────────────────────────────────────────

const createConversationSchema = z.object({
  otherUserId: objectId('חסר otherUserId'),
  jobPostId:   z.string().trim().nullable().optional(),
});

const sendMessageSchema = z.object({
  text: z.string({ required_error: 'הודעה ריקה', invalid_type_error: 'הודעה ריקה' })
    .trim()
    .min(1, 'הודעה ריקה')
    .max(C.MESSAGE_MAX, 'ההודעה ארוכה מדי'),
});

module.exports = {
  approximateBytes,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createPostSchema,
  createQuoteSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  createReviewSchema,
  updateWorkerSchema,
  availabilitySchema,
  verifyBadgeSchema,
  portfolioItemSchema,
  createConversationSchema,
  sendMessageSchema,
};
