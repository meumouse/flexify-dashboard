import { ref, computed, onMounted, watch } from 'vue';

const STORAGE_KEY_HISTORY = 'fd-search-history';
const STORAGE_KEY_ACCESSED = 'fd-recently-accessed';
const STORAGE_KEY_FREQUENT = 'fd-frequently-used';

const MAX_HISTORY_ITEMS = 10;
const MAX_RECENT_ITEMS = 5;
const MAX_FREQUENT_ITEMS = 5;

/**
 * Composable for managing search history and tracking frequently accessed items
 * @returns {Object} Search history management functions and data
 */
export const useSearchHistory = () => {
  const searchHistory = ref([]);
  const recentlyAccessed = ref([]);
  const frequentlyUsed = ref([]);

  /**
   * Loads search history from localStorage
   */
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) {
        searchHistory.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  /**
   * Saves search history to localStorage
   */
  const saveHistory = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY_HISTORY,
        JSON.stringify(searchHistory.value)
      );
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  /**
   * Adds a search query to history
   * @param {string} query - The search query to add
   */
  const addToHistory = (query) => {
    if (!query || query.trim() === '') return;

    const trimmedQuery = query.trim();

    // Remove if already exists
    const existingIndex = searchHistory.value.findIndex(
      (item) => item.query === trimmedQuery
    );
    if (existingIndex > -1) {
      searchHistory.value.splice(existingIndex, 1);
    }

    // Add to beginning
    searchHistory.value.unshift({
      query: trimmedQuery,
      timestamp: Date.now(),
    });

    // Keep only last MAX_HISTORY_ITEMS
    if (searchHistory.value.length > MAX_HISTORY_ITEMS) {
      searchHistory.value = searchHistory.value.slice(0, MAX_HISTORY_ITEMS);
    }

    saveHistory();
  };

  /**
   * Clears search history
   */
  const clearHistory = () => {
    searchHistory.value = [];
    saveHistory();
  };

  /**
   * Loads recently accessed items from localStorage
   */
  const loadRecentlyAccessed = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCESSED);
      if (stored) {
        recentlyAccessed.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading recently accessed:', error);
    }
  };

  /**
   * Saves recently accessed items to localStorage
   */
  const saveRecentlyAccessed = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY_ACCESSED,
        JSON.stringify(recentlyAccessed.value)
      );
    } catch (error) {
      console.error('Error saving recently accessed:', error);
    }
  };

  /**
   * Tracks an item as recently accessed
   * @param {Object} item - The item that was accessed
   * @param {string} item.id - Unique identifier
   * @param {string} item.category - Category/type of item
   * @param {string} item.name - Display name
   * @param {string} item.url - URL to access
   * @param {Object} item.metadata - Additional metadata
   */
  const trackAccess = (item) => {
    if (!item || !item.id || !item.category) return;

    const accessRecord = {
      ...item,
      timestamp: Date.now(),
      accessCount: 1,
    };

    // Remove if already exists
    const existingIndex = recentlyAccessed.value.findIndex(
      (r) => r.id === item.id && r.category === item.category
    );

    if (existingIndex > -1) {
      recentlyAccessed.value.splice(existingIndex, 1);
    }

    // Add to beginning
    recentlyAccessed.value.unshift(accessRecord);

    // Keep only last MAX_RECENT_ITEMS
    if (recentlyAccessed.value.length > MAX_RECENT_ITEMS) {
      recentlyAccessed.value = recentlyAccessed.value.slice(
        0,
        MAX_RECENT_ITEMS
      );
    }

    // Update frequently used
    updateFrequentlyUsed(item);

    saveRecentlyAccessed();
  };

  /**
   * Loads frequently used items from localStorage
   */
  const loadFrequentlyUsed = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FREQUENT);
      if (stored) {
        frequentlyUsed.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading frequently used:', error);
    }
  };

  /**
   * Saves frequently used items to localStorage
   */
  const saveFrequentlyUsed = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY_FREQUENT,
        JSON.stringify(frequentlyUsed.value)
      );
    } catch (error) {
      console.error('Error saving frequently used:', error);
    }
  };

  /**
   * Updates frequently used items based on access
   * @param {Object} item - The item that was accessed
   */
  const updateFrequentlyUsed = (item) => {
    if (!item || !item.id || !item.category) return;

    const existingIndex = frequentlyUsed.value.findIndex(
      (f) => f.id === item.id && f.category === item.category
    );

    if (existingIndex > -1) {
      // Increment access count and update timestamp
      frequentlyUsed.value[existingIndex].accessCount += 1;
      frequentlyUsed.value[existingIndex].lastAccessed = Date.now();
    } else {
      // Add new item
      frequentlyUsed.value.push({
        ...item,
        accessCount: 1,
        lastAccessed: Date.now(),
      });
    }

    // Sort by access count (descending) and keep top MAX_FREQUENT_ITEMS
    frequentlyUsed.value.sort((a, b) => {
      if (b.accessCount !== a.accessCount) {
        return b.accessCount - a.accessCount;
      }
      return b.lastAccessed - a.lastAccessed;
    });

    if (frequentlyUsed.value.length > MAX_FREQUENT_ITEMS) {
      frequentlyUsed.value = frequentlyUsed.value.slice(0, MAX_FREQUENT_ITEMS);
    }

    saveFrequentlyUsed();
  };

  /**
   * Gets filtered recently accessed items
   * @param {string} query - Optional search query to filter by
   * @returns {Array} Filtered recently accessed items
   */
  const getFilteredRecentlyAccessed = (query = '') => {
    if (!query) return recentlyAccessed.value;

    const lowerQuery = query.toLowerCase();
    return recentlyAccessed.value.filter((item) => {
      const name = item.name || item.title?.rendered || item.email || '';
      return name.toLowerCase().includes(lowerQuery);
    });
  };

  /**
   * Gets filtered frequently used items
   * @param {string} query - Optional search query to filter by
   * @returns {Array} Filtered frequently used items
   */
  const getFilteredFrequentlyUsed = (query = '') => {
    if (!query) return frequentlyUsed.value;

    const lowerQuery = query.toLowerCase();
    return frequentlyUsed.value.filter((item) => {
      const name = item.name || item.title?.rendered || item.email || '';
      return name.toLowerCase().includes(lowerQuery);
    });
  };

  // Initialize on mount
  onMounted(() => {
    loadHistory();
    loadRecentlyAccessed();
    loadFrequentlyUsed();
  });

  // Watch for changes and save
  watch(
    searchHistory,
    () => {
      saveHistory();
    },
    { deep: true }
  );

  watch(
    recentlyAccessed,
    () => {
      saveRecentlyAccessed();
    },
    { deep: true }
  );

  watch(
    frequentlyUsed,
    () => {
      saveFrequentlyUsed();
    },
    { deep: true }
  );

  return {
    searchHistory,
    recentlyAccessed,
    frequentlyUsed,
    addToHistory,
    clearHistory,
    trackAccess,
    getFilteredRecentlyAccessed,
    getFilteredFrequentlyUsed,
  };
};
