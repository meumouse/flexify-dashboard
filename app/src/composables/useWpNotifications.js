import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const targetSelector =
  ".notice:not(table .notice):not(#message.notice):not(.hide-if-js .notice):not(.themes .notice):not(.notice.hidden):not(.notice[aria-hidden='true']):not(.notice.hide-if-js)";

// Shared state across all instances
const sharedNotificationsCount = ref(0);
const sharedIsJiggling = ref(false);
const sharedMovedNotices = new Set();
let sharedPollInterval = null;
let pollInitialized = false;
let countLocked = false; // Lock count once notices are moved

/**
 * Composable for managing WordPress native notifications count
 * Runs immediately on mount, independent of drawer state
 *
 * @returns {Object} WordPress notifications state and functions
 */
export const useWpNotifications = () => {
  const notificationsCount = sharedNotificationsCount;
  const isJiggling = sharedIsJiggling;
  const movedNotices = sharedMovedNotices;

  /**
   * Check if an element is visible
   */
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };

  /**
   * Hide WordPress notifications from the page
   * Only hides notices in their original locations, not those already moved to container
   */
  const hideNotifications = () => {
    const notices = document.querySelectorAll(targetSelector);
    const container = document.querySelector('.wp-notifications-container');

    for (let item of [...notices]) {
      // Only hide if not already in container
      if (!container || !container.contains(item)) {
        item.style.display = 'none';
      }
    }
  };

  /**
   * Get count of WordPress notifications (initial count only)
   * This should only be called once on mount, before notices are moved
   */
  const getInitialNotificationsCount = async () => {
    // Find notices in original locations
    const notis = document.querySelectorAll(targetSelector);

    if (!notis || notis.length === 0) {
      notificationsCount.value = 0;
      return;
    }

    // Count notifications BEFORE hiding them
    let count = 0;
    for (let item of [...notis]) {
      // Skip if no text content or if it's the settings updated message
      if (!item.innerText || item.id == 'setting-error-settings_updated')
        continue;

      // Check if element has content
      const hasContent = item.innerText.trim().length > 0;
      if (hasContent) {
        count++;
      }
    }

    // Hide notifications from page (they'll be shown in the drawer)
    hideNotifications();

    const previousCount = notificationsCount.value;
    notificationsCount.value = count;

    // Trigger jiggle animation if count increased
    if (count > 0 && count > previousCount) {
      await nextTick();
      isJiggling.value = true;
      setTimeout(() => {
        isJiggling.value = false;
      }, 500);
    }
  };

  /**
   * Check for new notifications (only checks for new ones, doesn't reset count)
   * Used by polling to detect dynamically added notices
   */
  const checkForNewNotifications = () => {
    // If count is locked (notices already moved), don't reset
    if (countLocked) return;

    // Find notices in original locations
    const notis = document.querySelectorAll(targetSelector);

    if (!notis || notis.length === 0) {
      // Only set to 0 if we don't have any moved notices
      if (movedNotices.size === 0) {
        notificationsCount.value = 0;
      }
      return;
    }

    // Count only NEW notices (not already moved)
    let newCount = 0;
    for (let item of [...notis]) {
      // Skip if already moved
      if (movedNotices.has(item)) continue;

      // Skip if no text content or if it's the settings updated message
      if (!item.innerText || item.id == 'setting-error-settings_updated')
        continue;

      const hasContent = item.innerText.trim().length > 0;
      if (hasContent) {
        newCount++;
      }
    }

    // Update count if we found new notices
    if (newCount > 0) {
      const previousCount = notificationsCount.value;
      notificationsCount.value = Math.max(notificationsCount.value, newCount);

      // Hide new notifications
      hideNotifications();

      // Trigger jiggle if count increased
      if (notificationsCount.value > previousCount) {
        isJiggling.value = true;
        setTimeout(() => {
          isJiggling.value = false;
        }, 500);
      }
    }
  };

  /**
   * Start polling for WordPress notifications
   * Only checks for NEW notices, doesn't reset count
   */
  const startPolling = () => {
    if (sharedPollInterval) return;

    // Poll every 2 seconds for new notifications
    sharedPollInterval = setInterval(() => {
      checkForNewNotifications();
    }, 2000);
  };

  /**
   * Lock the count (called when notices are moved to container)
   */
  const lockCount = () => {
    countLocked = true;
  };

  /**
   * Stop polling for WordPress notifications
   */
  const stopPolling = () => {
    if (sharedPollInterval) {
      clearInterval(sharedPollInterval);
      sharedPollInterval = null;
    }
  };

  // Initialize on mount (only once globally)
  onMounted(() => {
    if (!pollInitialized) {
      pollInitialized = true;
      // Wait a bit for WordPress notices to render, then count ONCE
      setTimeout(() => {
        getInitialNotificationsCount();
      }, 100);

      // Start polling for new notifications (won't reset count)
      startPolling();
    }
  });

  hideNotifications();

  // Note: We don't stop polling on unmount since other components might still need it
  // The polling will continue until the page is refreshed

  return {
    notificationsCount,
    isJiggling,
    getInitialNotificationsCount,
    checkForNewNotifications,
    hideNotifications,
    startPolling,
    stopPolling,
    lockCount,
    targetSelector,
    movedNotices,
  };
};
