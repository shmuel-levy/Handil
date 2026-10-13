// Re-exported from @handil/shared so the app and the API can never disagree
// about which trades exist. Add a new category in
// packages/shared/src/categories.js only.
import { CATEGORIES, getCategoryBySlug, type Category } from '@handil/shared';

export { CATEGORIES, getCategoryBySlug };
export type { Category };
