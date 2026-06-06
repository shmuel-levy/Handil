/**
 * Demo seed script — populates MongoDB with realistic Hebrew data.
 * Run: node apps/api/scripts/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Worker = require('../src/models/Worker');
const JobPost = require('../src/models/JobPost');
const Booking = require('../src/models/Booking');
const Review = require('../src/models/Review');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/handil';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing demo data (emails starting with demo.)
  const demoEmails = await User.find({ email: /^demo\./ }).select('_id');
  const demoIds = demoEmails.map((u) => u._id);
  if (demoIds.length) {
    await Worker.deleteMany({ user: { $in: demoIds } });
    await JobPost.deleteMany({ resident: { $in: demoIds } });
    await Booking.deleteMany({ $or: [{ resident: { $in: demoIds } }, { worker: { $in: demoIds } }] });
    await Review.deleteMany({ $or: [{ resident: { $in: demoIds } }, { worker: { $in: demoIds } }] });
    await User.deleteMany({ _id: { $in: demoIds } });
    console.log('Cleared previous demo data');
  }

  const hash = (pw) => bcrypt.hash(pw, 10);

  // ── Residents ───────────────────────────────────────────────────────────────
  const [sarah, yoav] = await Promise.all([
    User.create({ name: 'שרה מזרחי', email: 'demo.sarah@handil.app', password: await hash('Demo1234!'), phone: '052-111-2222', role: 'resident' }),
    User.create({ name: 'יואב כהן',  email: 'demo.yoav@handil.app',  password: await hash('Demo1234!'), phone: '054-333-4444', role: 'resident' }),
  ]);

  // ── Workers ─────────────────────────────────────────────────────────────────
  const [uDavid, uMoshe, uYossi, uRachel, uAvi, uBenny] = await Promise.all([
    User.create({ name: 'דוד לוי',      email: 'demo.david@handil.app',  password: await hash('Demo1234!'), phone: '050-100-1001', role: 'worker' }),
    User.create({ name: 'משה כהן',      email: 'demo.moshe@handil.app',  password: await hash('Demo1234!'), phone: '050-100-1002', role: 'worker' }),
    User.create({ name: 'יוסי אברהם',  email: 'demo.yossi@handil.app',  password: await hash('Demo1234!'), phone: '050-100-1003', role: 'worker' }),
    User.create({ name: 'רחל ישראלי', email: 'demo.rachel@handil.app', password: await hash('Demo1234!'), phone: '050-100-1004', role: 'worker' }),
    User.create({ name: 'אבי שמעון',   email: 'demo.avi@handil.app',    password: await hash('Demo1234!'), phone: '050-100-1005', role: 'worker' }),
    User.create({ name: 'בני פרץ',     email: 'demo.benny@handil.app',  password: await hash('Demo1234!'), phone: '050-100-1006', role: 'worker' }),
  ]);

  const [wDavid, wMoshe, wYossi, wRachel, wAvi, wBenny] = await Promise.all([
    Worker.create({ user: uDavid._id,  categories: ['electrician'],       bio: 'חשמלאי מוסמך עם ניסיון של 12 שנה. מתמחה בהתקנת לוחות חשמל, נקודות חדשות ותיקון תקלות. עובד נקי ומסודר.', city: 'תל אביב', yearsExperience: 12, hourlyRate: 180, rating: 4.8, reviewCount: 47, isAvailable: true,  isVerified: true }),
    Worker.create({ user: uMoshe._id,  categories: ['plumber'],            bio: 'אינסטלטור עם 15 שנות ניסיון. תיקון ברזים, החלפת סיפונים, ניקוי סתימות. זמין לחירום 24/7.', city: 'תל אביב', yearsExperience: 15, hourlyRate: 160, rating: 4.6, reviewCount: 63, isAvailable: true,  isVerified: true }),
    Worker.create({ user: uYossi._id,  categories: ['painter'],            bio: 'צבעי מקצועי עם 8 שנות ניסיון. צביעת דירות, בניינים ועסקים. שימוש בחומרים איכותיים בלבד.', city: 'תל אביב', yearsExperience: 8,  hourlyRate: 120, rating: 4.9, reviewCount: 35, isAvailable: false, isVerified: true }),
    Worker.create({ user: uRachel._id, categories: ['cleaner'],            bio: 'ניקיון מקצועי לבית ועסק. שימוש במוצרים ידידותיים לסביבה. אמינה, דיסקרטית ויסודית.', city: 'רמת גן',  yearsExperience: 5,  hourlyRate: 100, rating: 4.7, reviewCount: 28, isAvailable: true,  isVerified: false }),
    Worker.create({ user: uAvi._id,    categories: ['carpenter', 'tiler'], bio: 'נגר ורצף עם 12 שנות ניסיון. הרכבת ארונות, רהיטים, שיפוץ מטבחים ואריחים.', city: 'תל אביב', yearsExperience: 12, hourlyRate: 200, rating: 4.5, reviewCount: 22, isAvailable: true,  isVerified: true }),
    Worker.create({ user: uBenny._id,  categories: ['locksmith'],          bio: 'מנעולן מוסמך. פתיחת דלתות, החלפת מנעולים, התקנת מנעולים בטחוניים. מגיע תוך 30 דקות.', city: 'תל אביב', yearsExperience: 10, hourlyRate: 200, rating: 4.4, reviewCount: 19, isAvailable: true,  isVerified: true }),
  ]);

  // ── Job Posts ────────────────────────────────────────────────────────────────
  const ago = (days) => new Date(Date.now() - days * 86400000);

  const posts = await JobPost.insertMany([
    {
      resident: sarah._id,
      title: 'מחפש חשמלאי להתקנת נקודות חשמל',
      description: 'צריך להוסיף 4 נקודות חשמל בסלון ובמטבח. הדירה שופצה לאחרונה ויש גבס חדש. צריך עבודה נקייה.',
      category: 'electrician',
      budget: 400,
      urgency: 'week',
      location: 'תל אביב',
      status: 'open',
      createdAt: ago(1),
    },
    {
      resident: yoav._id,
      title: 'תיקון ברז מטפטף בחדר אמבטיה',
      description: 'הברז מטפטף כבר שבועיים. ניסיתי להחליף את הפקק אבל לא עזר. צריך אינסטלטור שיגיע היום אם אפשר.',
      category: 'plumber',
      budget: 150,
      urgency: 'urgent',
      location: 'גבעתיים',
      status: 'open',
      createdAt: ago(0.5),
    },
    {
      resident: sarah._id,
      title: 'צביעת דירה 3 חדרים לפני מעבר דירה',
      description: 'דירה של 70 מ"ר, 3 חדרים + מסדרון. הקירות לבנים כרגע, רוצה שיישארו לבנים. צריך להיות גמור עד סוף החודש.',
      category: 'painter',
      budget: 2500,
      urgency: 'week',
      location: 'תל אביב',
      status: 'open',
      createdAt: ago(2),
    },
    {
      resident: yoav._id,
      title: 'הרכבת ארונות IKEA וספה',
      description: 'קניתי ארון PAX ספסל ממלבו וספת SÖDERHAMN. צריך עזרה בהרכבה. הכל בקופסאות, יש כלים.',
      category: 'carpenter',
      budget: 350,
      urgency: 'today',
      location: 'תל אביב',
      status: 'accepted',
      acceptedBy: uAvi._id,
      createdAt: ago(3),
    },
    {
      resident: sarah._id,
      title: 'ניקיון מעמיק לפני מסירת הדירה',
      description: 'דירה של 65 מ"ר, צריכה ניקיון מלא כולל חלונות, מטבח ואמבטיה. כמה שיותר מהר.',
      category: 'cleaner',
      budget: 500,
      urgency: 'today',
      location: 'תל אביב',
      status: 'open',
      createdAt: ago(0.2),
    },
    {
      resident: yoav._id,
      title: 'נעילת דלת — שכחתי מפתחות',
      description: 'נעלתי עצמי מחוץ לדירה. צריך מנעולן שיוכל להגיע עכשיו לתל אביב.',
      category: 'locksmith',
      budget: 250,
      urgency: 'urgent',
      location: 'תל אביב',
      status: 'closed',
      acceptedBy: uBenny._id,
      createdAt: ago(7),
    },
  ]);

  // ── Bookings ─────────────────────────────────────────────────────────────────
  const [b1, b2, b3, b4] = await Promise.all([
    Booking.create({
      resident: sarah._id,
      worker: uDavid._id,
      category: 'electrician',
      description: 'התקנת נקודת חשמל נוספת בחדר שינה',
      scheduledDate: ago(-2),
      status: 'completed',
      price: 180,
    }),
    Booking.create({
      resident: yoav._id,
      worker: uMoshe._id,
      category: 'plumber',
      description: 'ניקוי סתימה בכיור מטבח',
      scheduledDate: ago(-5),
      status: 'completed',
      price: 200,
    }),
    Booking.create({
      resident: sarah._id,
      worker: uRachel._id,
      category: 'cleaner',
      description: 'ניקיון שבועי לדירה',
      scheduledDate: ago(2),
      status: 'accepted',
      price: 300,
    }),
    Booking.create({
      resident: yoav._id,
      worker: uYossi._id,
      category: 'painter',
      description: 'צביעת מסדרון',
      scheduledDate: ago(5),
      status: 'pending',
      price: null,
    }),
  ]);

  // ── Reviews ──────────────────────────────────────────────────────────────────
  await Promise.all([
    Review.create({
      booking: b1._id,
      resident: sarah._id,
      worker: uDavid._id,
      rating: 5,
      comment: 'דוד פנטסטי! הגיע בזמן, עבד מהר ונקי. ממליצה בחום!',
      createdAt: ago(1),
    }),
    Review.create({
      booking: b2._id,
      resident: yoav._id,
      worker: uMoshe._id,
      rating: 4,
      comment: 'עבודה טובה ומקצועית. קצת אחר מהזמן שנקבע אבל סיים מהר.',
      createdAt: ago(4),
    }),
  ]);

  console.log('\n✅ Demo seed complete:');
  console.log('   2 residents (demo.sarah / demo.yoav — password: Demo1234!)');
  console.log('   6 workers  (demo.david / demo.moshe / demo.yossi / demo.rachel / demo.avi / demo.benny)');
  console.log('   6 job posts');
  console.log('   4 bookings');
  console.log('   2 reviews\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
