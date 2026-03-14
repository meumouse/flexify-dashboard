import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

/**
 * Composable for managing magic dark mode for specific pages
 * @returns {Object} Magic dark mode management functions
 */
export const useMagicDarkMode = () => {
  const appStore = useAppStore();

  /**
   * Get current page identifier for magic dark mode
   * @returns {string} Page identifier (URL path or page parameter)
   */
  const getCurrentPageIdentifier = () => {
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);

    // If there's a 'page' parameter, use that (for plugin settings pages)
    if (urlParams.has('page')) {
      return urlParams.get('page');
    }

    // Otherwise use the pathname
    const pathname = url.pathname;
    const adminPath =
      appStore.state.adminUrl?.replace(window.location.origin, '') ||
      '/wp-admin/';

    // Extract the page filename from the path
    if (pathname.includes(adminPath)) {
      const relativePath = pathname.replace(adminPath, '');
      return relativePath || 'index.php';
    }

    // Fallback to full pathname
    return pathname;
  };

  /**
   * Check if current page is in the magic dark mode pages array
   * @returns {boolean} True if page should have magic dark mode
   */
  const isCurrentPageInMagicDarkModeList = () => {
    const magicDarkModePages =
      appStore.state.flexify_dashboard_settings?.magic_dark_mode_pages || [];
    const currentPage = getCurrentPageIdentifier();
    return magicDarkModePages.includes(currentPage);
  };

  /**
   * Add current page to magic dark mode pages list
   */
  const enableMagicDarkModeForCurrentPage = async () => {
    const currentPage = getCurrentPageIdentifier();
    const magicDarkModePages =
      appStore.state.flexify_dashboard_settings?.magic_dark_mode_pages || [];

    // Don't add if already in list
    if (magicDarkModePages.includes(currentPage)) {
      return;
    }

    const updatedPages = [...magicDarkModePages, currentPage];

    try {
      const response = await lmnFetch({
        endpoint: 'wp/v2/settings',
        type: 'POST',
        data: {
          flexify_dashboard_settings: {
            ...appStore.state.flexify_dashboard_settings,
            magic_dark_mode_pages: updatedPages,
          },
        },
      });

      if (response && response.data) {
        appStore.updateState(
          'flexify_dashboard_settings',
          response.data.flexify_dashboard_settings
        );
        notify({
          message: __('Magic dark mode enabled for this page', 'flexify-dashboard'),
          type: 'success',
        });

        // Dispatch settings update event
        document.dispatchEvent(
          new CustomEvent('flexify-dashboard-settings-update', {
            detail: { magic_dark_mode_pages: updatedPages },
          })
        );
      }
    } catch (error) {
      notify({
        message: __('Failed to enable magic dark mode', 'flexify-dashboard'),
        type: 'error',
      });
      console.error('Error enabling magic dark mode:', error);
    }
  };

  /**
   * Remove current page from magic dark mode pages list
   */
  const disableMagicDarkModeForCurrentPage = async () => {
    const currentPage = getCurrentPageIdentifier();
    const magicDarkModePages =
      appStore.state.flexify_dashboard_settings?.magic_dark_mode_pages || [];

    // Don't remove if not in list
    if (!magicDarkModePages.includes(currentPage)) {
      return;
    }

    const updatedPages = magicDarkModePages.filter(
      (page) => page !== currentPage
    );

    try {
      const response = await lmnFetch({
        endpoint: 'wp/v2/settings',
        type: 'POST',
        data: {
          flexify_dashboard_settings: {
            ...appStore.state.flexify_dashboard_settings,
            magic_dark_mode_pages: updatedPages,
          },
        },
      });

      if (response && response.data) {
        appStore.updateState(
          'flexify_dashboard_settings',
          response.data.flexify_dashboard_settings
        );
        notify({
          message: __('Magic dark mode disabled for this page', 'flexify-dashboard'),
          type: 'success',
        });

        // Dispatch settings update event
        document.dispatchEvent(
          new CustomEvent('flexify-dashboard-settings-update', {
            detail: { magic_dark_mode_pages: updatedPages },
          })
        );
      }
    } catch (error) {
      notify({
        message: __('Failed to disable magic dark mode', 'flexify-dashboard'),
        type: 'error',
      });
      console.error('Error disabling magic dark mode:', error);
    }
  };

  return {
    getCurrentPageIdentifier,
    isCurrentPageInMagicDarkModeList,
    enableMagicDarkModeForCurrentPage,
    disableMagicDarkModeForCurrentPage,
  };
};
