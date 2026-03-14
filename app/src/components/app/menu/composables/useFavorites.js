import { ref, watch } from 'vue';

// Singleton state - shared across all imports
const favorites = ref([]);
const storageKey = 'fd-menu-favorites';
let isInitialized = false;

/**
 * Loads favorites from localStorage
 */
const loadFavorites = () => {
  if (isInitialized) return;
  const storedFavorites = localStorage.getItem(storageKey);
  if (storedFavorites) {
    try {
      favorites.value = JSON.parse(storedFavorites);
    } catch (e) {
      favorites.value = [];
    }
  }
  isInitialized = true;
};

/**
 * Saves favorites to localStorage
 */
const saveFavorites = () => {
  localStorage.setItem(storageKey, JSON.stringify(favorites.value));
};

// Watch for changes and persist (singleton watcher)
watch(
  favorites,
  () => {
    if (isInitialized) {
      saveFavorites();
    }
  },
  { deep: true }
);

// Initialize on first import
loadFavorites();

/**
 * Composable for managing menu favorites
 * Uses singleton pattern - all components share the same state
 *
 * @returns {Object} Favorites management functions
 */
export function useFavorites() {
  const addFavorite = (item) => {
    if (
      item &&
      item.url &&
      !favorites.value.some((fav) => fav.url === item.url)
    ) {
      // Ensure settings object exists
      if (!item.settings) {
        item.settings = {};
      }
      // Ensure name is set
      if (!item.settings.name) {
        item.settings.name = item.name || item.settings?.name || '';
      }
      // Ensure icon is set
      if (!item.settings.icon) {
        item.settings.icon = item.settings?.icon || 'link';
      }
      favorites.value.push(item);
    }
  };

  const removeFavorite = (item) => {
    const index = favorites.value.findIndex((fav) => fav.url === item.url);
    if (index > -1) {
      favorites.value.splice(index, 1);
    }
  };

  const updateFavorite = (oldItem, updatedItem) => {
    const index = favorites.value.findIndex((fav) => fav.url === oldItem.url);
    if (index > -1) {
      favorites.value[index] = { ...favorites.value[index], ...updatedItem };
      // Ensure settings object exists
      if (!favorites.value[index].settings) {
        favorites.value[index].settings = {};
      }
      // Merge settings
      if (updatedItem.settings) {
        favorites.value[index].settings = {
          ...favorites.value[index].settings,
          ...updatedItem.settings,
        };
      }
    }
  };

  const isFavorite = (url) => {
    return favorites.value.some((fav) => fav.url === url);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
  };
}
