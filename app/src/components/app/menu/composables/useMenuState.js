import { menu } from '../state/constants.js';
import { isCurrentLocationMatch } from '../utils/isCurrentLocationMatch.js';

/**
 * Composable for managing menu state (active state, submenu visibility, toggling)
 * Uses singleton pattern - operates on shared menu state from constants.js
 *
 * @returns {Object} Menu state management functions
 */
export function useMenuState() {
  /**
   * Checks if a given link is active.
   * First checks if window.location ends with the link URL, then falls back to existing logic.
   * @param {Object} link - The link object to check.
   * @param {string} link.url - The URL of the link
   * @param {boolean} link.active - Whether the link is marked as active
   * @param {Array} link.submenu - Optional submenu items
   * @returns {boolean} True if the link is active, false otherwise.
   */
  const isActive = (link) => {
    // First check if current location matches the link URL
    if (link?.url && isCurrentLocationMatch(link.url)) {
      return true;
    }

    // Fall back to existing active property
    if (link.active) return true;

    // Check submenu items
    if (link.submenu) {
      return link.submenu.find((item) => {
        // Check location match first for submenu items too
        if (item?.url && isCurrentLocationMatch(item.url)) {
          return true;
        }
        return item.active;
      });
    }

    return false;
  };

  /**
   * Toggles the open state of a menu item by finding it in the original menu array
   *
   * @param {Object} link - The menu item link object from the computed property
   * @returns {void}
   */
  const toggleMenuOpen = (link) => {
    if (!link || !link.id) return;

    // Find the original menu item in menu.value
    const findAndToggle = (items) => {
      for (let item of items) {
        if (item.id === link.id) {
          item.open = !item.open;
          return true;
        }
        // Check submenu items recursively
        if (Array.isArray(item.submenu) && item.submenu.length > 0) {
          if (findAndToggle(item.submenu)) {
            return true;
          }
        }
      }
      return false;
    };

    findAndToggle(menu.value);
  };

  /**
   * Determines if a submenu should be shown for a menu item
   * @param {Object} link - The menu item to check
   * @returns {boolean} True if submenu should be shown
   */
  const shouldShowSubMenu = (link) => {
    // No submenu
    if (!Array.isArray(link.submenu)) return false;
    // Empty submenu
    if (!link.submenu.length) return false;
    // Show if manually toggled open (using 'open' property) or if link is active
    if (link.open || link.active || isActive(link)) return true;

    return false;
  };

  return {
    isActive,
    toggleMenuOpen,
    shouldShowSubMenu,
  };
}
