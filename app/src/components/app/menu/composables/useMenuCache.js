import { useAppStore } from '@/store/app/app.js';

/**
 * Composable for managing menu caching in localStorage
 * 
 * @returns {Object} Menu cache management functions
 */
export function useMenuCache() {
  const appStore = useAppStore();

  /**
   * Gets the menu cache key combining user ID and cache key
   * @returns {string} The cache key for localStorage
   */
  const getMenuCacheKey = () => {
    const userID = appStore.state.userID || '';
    const cacheKey = appStore.state.menuCacheKey || '';
    return `flexify_dashboard_menu_${userID}_${cacheKey}`;
  };

  /**
   * Saves the menu into local storage
   * @param {Array|string} menuData - The menu data to cache (or 'no_menus' string)
   */
  const cacheMenu = (menuData) => {
    const key = getMenuCacheKey();
    const item = {
      value: menuData,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(key, JSON.stringify(item));
  };

  /**
   * Fetches menu from localStorage, returns null if expired or not found
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   * @returns {Array|string|null} The cached menu data or null if expired/not found
   */
  const getMenuFromLocalStorage = (maxAge = 60 * 60 * 1000) => {
    const key = getMenuCacheKey();
    const item = localStorage.getItem(key);

    if (!item) {
      return null;
    }

    try {
      const parsedItem = JSON.parse(item);
      const now = new Date().getTime();

      if (now - parsedItem.timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      return parsedItem.value;
    } catch (e) {
      // Invalid JSON, remove and return null
      localStorage.removeItem(key);
      return null;
    }
  };

  /**
   * Clears the cached menu from localStorage
   */
  const clearMenuCache = () => {
    const key = getMenuCacheKey();
    localStorage.removeItem(key);
  };

  /**
   * Checks if cached menu exists and is valid
   * @returns {boolean} True if valid cache exists
   */
  const hasCachedMenu = () => {
    return getMenuFromLocalStorage() !== null;
  };

  return {
    getMenuCacheKey,
    cacheMenu,
    getMenuFromLocalStorage,
    clearMenuCache,
    hasCachedMenu,
  };
}
