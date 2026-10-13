// Type declarations for @handil/shared (the implementation is CommonJS JS,
// so that Node can require it directly and Metro can bundle it unchanged).

export interface Category {
  slug: string;
  name_he: string;
  name_en: string;
  /** Ionicons glyph name */
  icon: string;
}

export declare const CATEGORIES: Category[];
export declare const CATEGORY_SLUGS: string[];
export declare function getCategoryBySlug(slug: string): Category | undefined;

export type Role = 'resident' | 'worker';
export type Urgency = 'urgent' | 'today' | 'week' | 'flexible';
export type PostStatus = 'open' | 'accepted' | 'closed';
export type QuoteStatus = 'pending' | 'accepted' | 'rejected';
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type VerificationBadge = 'phone' | 'id' | 'bank';

export declare const ROLES: Role[];
export declare const URGENCY_LEVELS: Urgency[];
export declare const URGENT_TTL_MS: number;
export declare const POST_STATUSES: PostStatus[];
export declare const QUOTE_STATUSES: QuoteStatus[];
export declare const BOOKING_STATUSES: BookingStatus[];
export declare const WORKER_BOOKING_STATUSES: BookingStatus[];
export declare const RESIDENT_BOOKING_STATUSES: BookingStatus[];
export declare const VERIFICATION_BADGES: VerificationBadge[];

export declare const PASSWORD_MIN_LENGTH: number;
export declare const POST_TITLE_MAX: number;
export declare const POST_DESCRIPTION_MAX: number;
export declare const MESSAGE_MAX: number;
export declare const MAX_POST_IMAGES: number;
export declare const MAX_IMAGE_BYTES: number;
export declare const MAX_AVATAR_BYTES: number;
export declare const DEFAULT_PAGE_SIZE: number;
export declare const MAX_PAGE_SIZE: number;

/** Zod request schemas. Typed loosely so the mobile app need not depend on zod's types. */
export declare const schemas: Record<string, {
  parse(input: unknown): unknown;
  safeParse(input: unknown): { success: boolean; data?: unknown; error?: unknown };
}>;
