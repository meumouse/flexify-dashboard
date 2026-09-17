/**
 * Search component constants
 */

/**
 * Command patterns for search syntax
 * Maps command prefixes to filter types
 */
export const COMMAND_PATTERNS = {
  '>post': 'post',
  '>page': 'page',
  '@user': 'user',
  '#category': 'category',
  '!action': 'quickActions',
  '?help': 'help',
};

/**
 * Example searches shown in onboarding and empty state
 * Uses getter functions for translations to ensure they're evaluated at runtime
 */
export const EXAMPLE_SEARCHES = [
  {
    query: '>post',
    get label() {
      return __('Search posts', 'flexify-dashboard');
    },
    icon: 'description',
  },
  {
    query: '@user',
    get label() {
      return __('Find users', 'flexify-dashboard');
    },
    icon: 'person',
  },
  {
    query: '!action',
    get label() {
      return __('Quick actions', 'flexify-dashboard');
    },
    icon: 'bolt',
  },
  {
    query: '?help',
    get label() {
      return __('View commands', 'flexify-dashboard');
    },
    icon: 'help',
  },
];

/**
 * Default quick action IDs
 */
export const QUICK_ACTION_IDS = {
  NEW_POST: 'new-post',
  NEW_PAGE: 'new-page',
  VIEW_DASHBOARD: 'view-dashboard',
  VIEW_SITE: 'view-site',
  SITE_SETTINGS: 'site-settings',
  DARK_MODE: 'dark-mode',
  LIGHT_MODE: 'light-mode',
  ENABLE_MAGIC_DARK_MODE: 'enable-magic-dark-mode',
  DISABLE_MAGIC_DARK_MODE: 'disable-magic-dark-mode',
  FIX_LAYOUT: 'fix-layout',
};

/**
 * Post status badge configuration
 */
export const STATUS_BADGE_CLASSES = {
  publish:
    'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
  draft:
    'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
  pending:
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  private: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  future:
    'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400',
};

/**
 * Gets post status label with translation
 * @param {string} status - Post status
 * @returns {string} Translated status label
 */
export const getStatusLabelText = (status) => {
  const labels = {
    publish: __('Published', 'flexify-dashboard'),
    draft: __('Draft', 'flexify-dashboard'),
    pending: __('Pending', 'flexify-dashboard'),
    private: __('Private', 'flexify-dashboard'),
    future: __('Scheduled', 'flexify-dashboard'),
  };
  return labels[status] || status;
};

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  ONBOARDING_SEEN: 'fd-search-onboarding-seen',
};

/**
 * Search debounce delay in milliseconds
 */
export const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Maximum items to display in various sections
 */
export const MAX_DISPLAY_ITEMS = {
  HISTORY: 5,
  RECENTLY_ACCESSED: 3,
  FREQUENTLY_USED: 3,
  SEARCH_RESULTS_PER_TYPE: 5,
};
