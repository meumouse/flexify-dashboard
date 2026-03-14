import { computed, ref } from 'vue';
import { useAppStore } from '@/store/app/app.js';

/**
 * Composable for managing remote site menu filtering
 * 
 * @returns {Object} Remote site filtering functions and state
 */
export function useRemoteFiltering() {
  const appStore = useAppStore();
  
  // Selected remote site from localStorage
  const selectedRemoteSite = ref(
    localStorage.getItem('flexify_dashboard_selected_site') || 'local'
  );

  /**
   * Checks if user can see the remote site switcher based on capability
   * @computed
   * @returns {boolean} Whether user can see the switcher
   */
  const canSeeRemoteSiteSwitcher = computed(() => {
    const settings = appStore.state?.flexify_dashboard_settings;
    const remoteSites = settings?.remote_sites || [];

    // Don't show if no remote sites configured
    if (!Array.isArray(remoteSites) || remoteSites.length === 0) {
      return false;
    }

    // Get capability requirement (defaults to 'manage_options')
    const requiredCapability =
      settings?.remote_site_switcher_capability || 'manage_options';

    // If capability is 'manage_options', use the existing canManageOptions flag
    if (requiredCapability === 'manage_options') {
      return appStore.state.canManageOptions === true;
    }

    // For other capabilities, default to showing if user can manage options (admin)
    return appStore.state.canManageOptions === true;
  });

  /**
   * Checks if a remote site is currently active
   * @computed
   * @returns {boolean} True if remote site is active
   */
  const isRemoteSiteActive = computed(() => {
    return selectedRemoteSite.value && selectedRemoteSite.value !== 'local';
  });

  /**
   * Gets the allowed menu IDs for remote sites based on enabled settings
   * @returns {Object} Object with topLevelIds and submenuIds arrays
   */
  const getAllowedRemoteMenuIds = () => {
    const settings = appStore.state?.flexify_dashboard_settings || {};
    const topLevelIds = [];
    const submenuIds = [];

    // Flexify Dashboard top-level menu - always keep it
    topLevelIds.push('flexify-dashboard-settings');

    // Flexify Dashboard submenu items (under flexify-dashboard-settings)
    // Menu Creator - always available
    submenuIds.push('flexify-dashboard-menucreator');

    // Activity Log
    if (settings.enable_activity_logger === true) {
      submenuIds.push('flexify-dashboard-activity-log');
    }

    // Database Explorer
    if (settings.enable_database_explorer === true) {
      submenuIds.push('flexify-dashboard-database-explorer');
    }

    // Admin Notices - always available
    submenuIds.push('flexify-dashboard-admin-notices');

    // Role Editor
    if (settings.enable_role_editor === true) {
      submenuIds.push('flexify-dashboard-role-editor');
    }

    // Settings submenu (the main settings page itself)
    submenuIds.push('flexify-dashboard-settings');

    // Other top-level Flexify Dashboard pages
    // Modern Media Page - WordPress uses "menu-media" as the ID
    if (settings.use_modern_media_page === true) {
      topLevelIds.push('menu-media');
      topLevelIds.push('upload'); // Also check for upload in case
    }

    // Modern Plugins Page
    if (settings.use_modern_plugin_page === true) {
      topLevelIds.push('plugin-manager');
      topLevelIds.push('toplevel_page_plugin-manager'); // WordPress format
    }

    // Modern Dashboard - WordPress uses "menu-dashboard" as the ID
    if (settings.use_custom_dashboard === true) {
      topLevelIds.push('menu-dashboard');
      topLevelIds.push('dashboard'); // Also check for dashboard
    }

    // Modern Users Page - WordPress uses "menu-users" as the ID
    if (settings.use_modern_users_page === true) {
      topLevelIds.push('menu-users');
      topLevelIds.push('users'); // Also check for users
    }

    return { topLevelIds, submenuIds };
  };

  /**
   * Checks if a menu item ID matches any of the allowed IDs
   * @param {string} itemId - The menu item ID to check
   * @param {Array} allowedIds - Array of allowed menu IDs
   * @returns {boolean} True if the item ID matches an allowed ID
   */
  const isAllowedMenuId = (itemId, allowedIds) => {
    if (!itemId) return false;

    // Check exact match first
    if (allowedIds.includes(itemId)) return true;

    // Extract the slug from WordPress menu ID formats:
    // - "toplevel_page_plugin-manager" -> "plugin-manager"
    // - "flexify_dashboard_page_flexify-dashboard-activity-log" -> "flexify-dashboard-activity-log"
    // - "toplevel_page_flexify-dashboard-settings" -> "flexify-dashboard-settings"
    const idParts = itemId.split('_');

    // Try last part (most common case)
    const lastPart = idParts[idParts.length - 1];
    if (allowedIds.includes(lastPart)) return true;

    // Try matching any part of the ID
    for (const part of idParts) {
      if (allowedIds.includes(part)) return true;
    }

    // Check if any allowed ID is contained in the item ID
    for (const allowedId of allowedIds) {
      if (itemId.includes(allowedId)) return true;
    }

    return false;
  };

  /**
   * Checks if a menu item is the Flexify Dashboard settings menu
   * @param {string} itemId - The menu item ID to check
   * @returns {boolean} True if it's the Flexify Dashboard settings menu
   */
  const isUiXpressSettingsMenu = (itemId) => {
    if (!itemId) return false;
    return itemId === 'flexify-dashboard-settings' || itemId.includes('flexify-dashboard-settings');
  };

  /**
   * Filters menu items based on remote site status
   * @param {Array} menuItems - The menu items to filter
   * @returns {Array} Filtered array of menu items
   */
  const filterMenuForRemoteSite = (menuItems) => {
    if (!isRemoteSiteActive.value) {
      return menuItems;
    }

    const { topLevelIds, submenuIds } = getAllowedRemoteMenuIds();

    return menuItems
      .filter((item) => {
        // Only include top-level items that match allowed IDs
        return isAllowedMenuId(item.id, topLevelIds);
      })
      .map((item) => {
        // If it's the Flexify Dashboard settings menu, keep submenus but filter them
        if (isUiXpressSettingsMenu(item.id)) {
          const filteredSubmenu = Array.isArray(item.submenu)
            ? item.submenu.filter((subItem) => {
                // First check if item is hidden
                if (subItem.settings?.hidden) {
                  return false;
                }

                // Check URL for page parameter
                if (subItem.url) {
                  for (const allowedId of submenuIds) {
                    if (
                      subItem.url.includes(`page=${allowedId}`) ||
                      subItem.url.includes(`&page=${allowedId}`)
                    ) {
                      return true;
                    }
                  }
                }

                // Check sub_id
                if (subItem.sub_id) {
                  if (isAllowedMenuId(subItem.sub_id, submenuIds)) {
                    return true;
                  }
                }

                // Check constructed id
                if (subItem.id) {
                  if (isAllowedMenuId(subItem.id, submenuIds)) {
                    return true;
                  }
                  if (subItem.url) {
                    for (const allowedId of submenuIds) {
                      if (subItem.id.includes(allowedId)) {
                        return true;
                      }
                    }
                  }
                }

                return false;
              })
            : [];

          return {
            ...item,
            submenu: filteredSubmenu,
            active: item.active,
          };
        }

        // Remove submenus from all other items when remote site is active
        return {
          ...item,
          submenu: [],
        };
      });
  };

  return {
    selectedRemoteSite,
    canSeeRemoteSiteSwitcher,
    isRemoteSiteActive,
    getAllowedRemoteMenuIds,
    isAllowedMenuId,
    isUiXpressSettingsMenu,
    filterMenuForRemoteSite,
  };
}
