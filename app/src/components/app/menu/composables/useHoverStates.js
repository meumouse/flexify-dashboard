import { reactive } from 'vue';

// Singleton state - shared across all imports
const hoverStates = reactive({});

/**
 * Composable for managing hover states of menu items
 * Uses singleton pattern - all components share the same state
 *
 * @returns {Object} Hover state management functions
 */
export function useHoverStates() {
  /**
   * Sets the hover state for a menu item
   * @param {Object} link - The menu item
   * @param {boolean} state - The hover state
   */
  const setHoverState = (link, state) => {
    if (!link?.id) return;
    hoverStates[link.id] = state;
  };

  /**
   * Gets the hover state for a menu item
   * @param {Object} link - The menu item
   * @returns {boolean} The hover state
   */
  const isHovered = (link) => {
    if (!link?.id) return false;
    return hoverStates[link.id] || false;
  };

  /**
   * Clears all hover states
   */
  const clearHoverStates = () => {
    Object.keys(hoverStates).forEach((key) => {
      delete hoverStates[key];
    });
  };

  return {
    hoverStates,
    setHoverState,
    isHovered,
    clearHoverStates,
  };
}
