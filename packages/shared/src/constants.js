/**
 * Cross-cutting constants shared by the API and the mobile client.
 * Anything both sides must agree on belongs here, not in one of them.
 */

const ROLES = ['resident', 'worker'];

const URGENCY_LEVELS = ['urgent', 'today', 'week', 'flexible'];

/** Urgent posts stop being shown 24h after they are created. */
const URGENT_TTL_MS = 24 * 60 * 60 * 1000;

const POST_STATUSES    = ['open', 'accepted', 'closed'];
const QUOTE_STATUSES   = ['pending', 'accepted', 'rejected'];
const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

/** Which booking statuses each side is allowed to set. */
const WORKER_BOOKING_STATUSES   = ['accepted', 'rejected', 'completed'];
const RESIDENT_BOOKING_STATUSES = ['cancelled'];

const VERIFICATION_BADGES = ['phone', 'id', 'bank'];

// ─── Limits ───────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 8;

const POST_TITLE_MAX       = 120;
const POST_DESCRIPTION_MAX = 1000;
const MESSAGE_MAX          = 2000;

/** Images per job post, and the largest single image we accept. */
const MAX_POST_IMAGES     = 4;
const MAX_IMAGE_BYTES     = 2 * 1024 * 1024;   // 2 MB per image
const MAX_AVATAR_BYTES    = 1 * 1024 * 1024;   // 1 MB for a profile photo

/** Default and maximum page sizes for list endpoints. */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 50;

module.exports = {
  ROLES,
  URGENCY_LEVELS,
  URGENT_TTL_MS,
  POST_STATUSES,
  QUOTE_STATUSES,
  BOOKING_STATUSES,
  WORKER_BOOKING_STATUSES,
  RESIDENT_BOOKING_STATUSES,
  VERIFICATION_BADGES,
  PASSWORD_MIN_LENGTH,
  POST_TITLE_MAX,
  POST_DESCRIPTION_MAX,
  MESSAGE_MAX,
  MAX_POST_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_AVATAR_BYTES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};
