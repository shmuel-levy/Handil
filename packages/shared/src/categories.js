/**
 * The 12 Handil service categories — the single source of truth.
 *
 * This list was previously duplicated in apps/api/src/data/categories.js and
 * apps/mobile/src/constants/categories.ts, which meant a new trade had to be
 * added twice and could silently drift. Both now re-export from here.
 *
 * `icon` is an Ionicons name, used by the mobile client.
 */
const CATEGORIES = [
  { slug: 'plumber',          name_he: 'אינסטלטור',      name_en: 'Plumber',           icon: 'water-outline' },
  { slug: 'electrician',      name_he: 'חשמלאי',          name_en: 'Electrician',       icon: 'flash-outline' },
  { slug: 'carpenter',        name_he: 'נגר',             name_en: 'Carpenter',         icon: 'construct-outline' },
  { slug: 'painter',          name_he: 'צבעי',            name_en: 'Painter',           icon: 'color-palette-outline' },
  { slug: 'locksmith',        name_he: 'מנעולן',          name_en: 'Locksmith',         icon: 'key-outline' },
  { slug: 'cleaner',          name_he: 'ניקיון',          name_en: 'Cleaning',          icon: 'sparkles-outline' },
  { slug: 'ac_technician',    name_he: 'מזגנים',          name_en: 'AC Technician',     icon: 'snow-outline' },
  { slug: 'mover',            name_he: 'הובלות',          name_en: 'Moving',            icon: 'cube-outline' },
  { slug: 'gardener',         name_he: 'גינון',           name_en: 'Gardening',         icon: 'leaf-outline' },
  { slug: 'tiler',            name_he: 'ריצוף',           name_en: 'Tiling',            icon: 'grid-outline' },
  { slug: 'welder',           name_he: 'מסגרות',          name_en: 'Welding / Metal',   icon: 'hammer-outline' },
  { slug: 'appliance_repair', name_he: 'תיקון מכשירים',  name_en: 'Appliance Repair',  icon: 'build-outline' },
];

const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

function getCategoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

module.exports = { CATEGORIES, CATEGORY_SLUGS, getCategoryBySlug };
