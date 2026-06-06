export interface Category {
  slug: string;
  name_he: string;
  name_en: string;
  icon: string; // Ionicons name
}

export const CATEGORIES: Category[] = [
  { slug: 'plumber',          name_he: 'אינסטלטור',     name_en: 'Plumber',         icon: 'water-outline' },
  { slug: 'electrician',      name_he: 'חשמלאי',         name_en: 'Electrician',     icon: 'flash-outline' },
  { slug: 'carpenter',        name_he: 'נגר',            name_en: 'Carpenter',       icon: 'construct-outline' },
  { slug: 'painter',          name_he: 'צבעי',           name_en: 'Painter',         icon: 'color-palette-outline' },
  { slug: 'locksmith',        name_he: 'מנעולן',         name_en: 'Locksmith',       icon: 'key-outline' },
  { slug: 'cleaner',          name_he: 'ניקיון',         name_en: 'Cleaning',        icon: 'sparkles-outline' },
  { slug: 'ac_technician',    name_he: 'מזגנים',         name_en: 'AC Technician',   icon: 'snow-outline' },
  { slug: 'mover',            name_he: 'הובלות',         name_en: 'Moving',          icon: 'cube-outline' },
  { slug: 'gardener',         name_he: 'גינון',          name_en: 'Gardening',       icon: 'leaf-outline' },
  { slug: 'tiler',            name_he: 'ריצוף',          name_en: 'Tiling',          icon: 'grid-outline' },
  { slug: 'welder',           name_he: 'מסגרות',         name_en: 'Metalwork',       icon: 'hammer-outline' },
  { slug: 'appliance_repair', name_he: 'תיקון מכשירים', name_en: 'Appliance Repair', icon: 'build-outline' },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
