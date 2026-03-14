import { ref, computed, watchEffect, nextTick, onMounted } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';
import { applyFilters } from '@/assets/js/functions/HooksSystem.js';
import { useMagicDarkMode } from './useMagicDarkMode.js';
import { QUICK_ACTION_IDS } from '../state/constants.js';

/**
 * Composable for managing quick actions in search
 * @returns {Object} Quick actions state and functions
 */
export const useQuickActions = () => {
  const appStore = useAppStore();
  const { setColorScheme, prefersDark, globalOverride } = useColorScheme();
  const {
    isCurrentPageInMagicDarkModeList,
    enableMagicDarkModeForCurrentPage,
    disableMagicDarkModeForCurrentPage,
  } = useMagicDarkMode();

  const quickActions = ref([]);

  /**
   * Creates a new post
   */
  const newPost = () => {
    window.location.href = `${appStore.state.adminUrl}post-new.php`;
  };

  /**
   * Creates a new page
   */
  const newPage = () => {
    window.location.href = `${appStore.state.adminUrl}post-new.php?post_type=page`;
  };

  /**
   * Default quick actions definition
   */
  const getDefaultQuickActions = () => [
    {
      id: QUICK_ACTION_IDS.NEW_POST,
      name: __('New Post', 'flexify-dashboard'),
      icon: 'add',
      action: () => newPost(),
    },
    {
      id: QUICK_ACTION_IDS.NEW_PAGE,
      name: __('New Page', 'flexify-dashboard'),
      icon: 'add',
      action: () => newPage(),
    },
    {
      id: QUICK_ACTION_IDS.VIEW_DASHBOARD,
      name: __('View dashboard', 'flexify-dashboard'),
      icon: 'equalizer',
      action: () => (window.location.href = `${appStore.state.adminUrl}`),
    },
    {
      id: QUICK_ACTION_IDS.VIEW_SITE,
      name: __('View site', 'flexify-dashboard'),
      icon: 'home',
      action: () => (window.location.href = `${appStore.state.siteURL}`),
    },
    {
      id: QUICK_ACTION_IDS.SITE_SETTINGS,
      name: __('Site settings', 'flexify-dashboard'),
      icon: 'tune',
      action: () =>
        (window.location.href = `${appStore.state.adminUrl}options-general.php`),
    },
    {
      id: QUICK_ACTION_IDS.DARK_MODE,
      name: __('Dark mode', 'flexify-dashboard'),
      icon: 'dark_mode',
      action: () => setColorScheme('dark'),
      hidden: false,
    },
    {
      id: QUICK_ACTION_IDS.LIGHT_MODE,
      name: __('Light mode', 'flexify-dashboard'),
      icon: 'light_mode',
      action: () => setColorScheme('light'),
      hidden: false,
    },
    {
      id: QUICK_ACTION_IDS.ENABLE_MAGIC_DARK_MODE,
      name: __('Enable magic dark mode for this page', 'flexify-dashboard'),
      icon: 'dark_mode',
      action: () => enableMagicDarkModeForCurrentPage(),
      hidden: true,
    },
    {
      id: QUICK_ACTION_IDS.DISABLE_MAGIC_DARK_MODE,
      name: __('Disable magic dark mode for this page', 'flexify-dashboard'),
      icon: 'light_mode',
      action: () => disableMagicDarkModeForCurrentPage(),
      hidden: true,
    },
  ];

  /**
   * Filters quick actions based on search query
   * @param {string} query - The search query
   * @param {string} commandFilter - The active command filter
   * @returns {Array} Filtered quick actions
   */
  const getFilteredQuickActions = (query, commandFilter) => {
    // If command filter is set to quickActions or help, show all
    if (commandFilter === 'quickActions' || commandFilter === 'help') {
      return quickActions.value.filter((action) => !action.hidden);
    }

    // If command filter excludes quickActions, hide them
    if (commandFilter && commandFilter !== 'quickActions') {
      return [];
    }

    if (!query) return quickActions.value.filter((action) => !action.hidden);
    
    const lowerQuery = query.toLowerCase();
    return quickActions.value.filter(
      (action) => action.name.toLowerCase().includes(lowerQuery) && !action.hidden
    );
  };

  /**
   * Initializes quick actions with filter hook support
   */
  const initializeQuickActions = async () => {
    // Dispatch event for plugins to register quick actions
    const event = new CustomEvent('flexify-dashboard/search/ready');
    document.dispatchEvent(event);

    await nextTick();

    // Register quick actions via filter hook
    let actionsToRegister = getDefaultQuickActions();

    // Remove site settings if user can't manage options
    if (!appStore.state.canManageOptions) {
      actionsToRegister = actionsToRegister.filter(
        (item) => item.id !== QUICK_ACTION_IDS.SITE_SETTINGS
      );
    }

    // Apply filter hook to allow plugins to register/deregister actions
    quickActions.value = await applyFilters(
      'flexify-dashboard/search/quickActions/register',
      actionsToRegister
    );
  };

  /**
   * Updates quick action visibility based on dark mode state
   */
  const updateDarkModeVisibility = () => {
    const darkItem = quickActions.value.find(
      (item) => item.id === QUICK_ACTION_IDS.DARK_MODE
    );
    const lightItem = quickActions.value.find(
      (item) => item.id === QUICK_ACTION_IDS.LIGHT_MODE
    );
    const enableMagicDarkItem = quickActions.value.find(
      (item) => item.id === QUICK_ACTION_IDS.ENABLE_MAGIC_DARK_MODE
    );
    const disableMagicDarkItem = quickActions.value.find(
      (item) => item.id === QUICK_ACTION_IDS.DISABLE_MAGIC_DARK_MODE
    );

    // Skip if items not found
    if (!darkItem || !lightItem) return;

    // Global theme is set so remove switchers
    if (globalOverride.value) {
      darkItem.hidden = true;
      lightItem.hidden = true;
      if (enableMagicDarkItem) enableMagicDarkItem.hidden = true;
      if (disableMagicDarkItem) disableMagicDarkItem.hidden = true;
      return;
    }

    if (prefersDark.value) {
      darkItem.hidden = true;
      lightItem.hidden = false;
    } else {
      darkItem.hidden = false;
      lightItem.hidden = true;
    }

    // Show/hide magic dark mode actions based on current page status
    if (enableMagicDarkItem && disableMagicDarkItem) {
      const isInList = isCurrentPageInMagicDarkModeList();
      if (prefersDark.value) {
        enableMagicDarkItem.hidden = isInList;
        disableMagicDarkItem.hidden = !isInList;
      } else {
        enableMagicDarkItem.hidden = true;
        disableMagicDarkItem.hidden = true;
      }
    }
  };

  // Watch for dark mode changes
  watchEffect(() => {
    if (quickActions.value.length > 0) {
      updateDarkModeVisibility();
    }
  });

  return {
    quickActions,
    getFilteredQuickActions,
    initializeQuickActions,
    updateDarkModeVisibility,
  };
};
