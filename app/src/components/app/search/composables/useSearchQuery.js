import { ref, computed, watch } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { inSearch } from '@/assets/js/functions/inSearch.js';
import { useSearchHistory } from '@/composables/useSearchHistory.js';
import { parseCommandSyntax } from '../utils/parseCommandSyntax.js';
import { debounce } from '../utils/debounce.js';
import { SEARCH_DEBOUNCE_DELAY } from '../state/constants.js';

/**
 * Composable for managing search query state and search operations
 * @returns {Object} Search query state and functions
 */
export const useSearchQuery = () => {
  const appStore = useAppStore();
  const {
    searchHistory,
    addToHistory,
    clearHistory,
    trackAccess,
    getFilteredRecentlyAccessed,
    getFilteredFrequentlyUsed,
  } = useSearchHistory();

  const searchQuery = ref('');
  const searchResults = ref({});
  const isLoading = ref(false);
  const activeResultIndex = ref(-1);
  const showHistoryDropdown = ref(false);

  /**
   * Parsed query with command filter
   */
  const parsedQuery = computed(() => parseCommandSyntax(searchQuery.value));

  /**
   * Current command filter
   */
  const commandFilter = computed(() => parsedQuery.value.filter);

  /**
   * Returns search endpoints based on settings
   */
  const returnEndPoints = computed(() => {
    const search_post_types = appStore.state.flexify_dashboard_settings.search_post_types;

    let endpoints = [
      {
        name: 'posts',
        slug: 'post',
        endpoint: 'wp/v2/posts',
        searchParam: 'search',
      },
      {
        name: 'pages',
        slug: 'page',
        endpoint: 'wp/v2/pages',
        searchParam: 'search',
      },
    ];

    if (Array.isArray(search_post_types)) {
      if (search_post_types.length > 0) {
        endpoints.splice(0, 2);

        const formatted = search_post_types.map((item) => ({
          ...item,
          endpoint: item.rest_base,
          searchParam: 'search',
        }));

        endpoints = [...formatted, ...endpoints];
      }
    }

    endpoints.push({
      name: 'categories',
      slug: 'category',
      endpoint: 'wp/v2/categories',
      searchParam: 'search',
    });

    if (appStore.state.canManageOptions) {
      endpoints.push({
        name: 'users',
        slug: 'user',
        endpoint: 'wp/v2/users',
        searchParam: 'search',
      });
    }

    return endpoints;
  });

  /**
   * Returns category name from slug
   * @param {string} slug - Category slug
   * @returns {string} Category name
   */
  const returnCategoryName = (slug) => {
    const categories = returnEndPoints.value;
    const category = categories.find((cat) => cat.slug === slug);
    return category ? category.name : slug;
  };

  /**
   * Returns admin menu links matching search query
   */
  const returnAdminMenuLinks = computed(() => {
    let formatted = [];

    if (!Array.isArray(appStore.state.adminMenu)) return [];

    for (let parent of appStore.state.adminMenu) {
      if (parent.type === 'separator') continue;
      if (parent?.settings?.hidden) continue;

      if (
        inSearch(
          searchQuery.value,
          parent?.settings?.name || parent.name,
          parent.url
        )
      ) {
        formatted.push({
          url: parent.url,
          name: parent?.settings?.name || parent.name,
          id: `${parent.url}-${parent.name}`,
        });
      }

      if (!Array.isArray(parent.submenu)) continue;

      for (let subitem of parent.submenu) {
        if (subitem.type === 'separator') continue;
        if (subitem?.settings?.hidden) continue;

        if (
          !inSearch(
            searchQuery.value,
            subitem.name || subitem?.settings?.name,
            subitem.url
          )
        )
          continue;

        formatted.push({
          url: subitem.url,
          name: `<span class="text-zinc-400 dark:text-zinc-400">${
            parent?.settings?.name || parent.name
          } ></span> ${subitem?.settings?.name || subitem.name}`,
          id: `${subitem.url}-${subitem.name}`,
        });
      }
    }

    return formatted;
  });

  /**
   * Filters search results based on command filter
   */
  const filteredSearchResults = computed(() => {
    const results = { ...searchResults.value };

    if (commandFilter.value) {
      if (commandFilter.value === 'quickActions') {
        return {};
      }
      if (commandFilter.value === 'help') {
        return {};
      }

      const filtered = {};
      if (results[commandFilter.value]) {
        filtered[commandFilter.value] = results[commandFilter.value];
      }
      return filtered;
    }

    return results;
  });

  /**
   * Performs the search across all endpoints
   */
  const performSearch = async () => {
    const cleanQuery = parsedQuery.value.cleanQuery;

    if (cleanQuery.trim() === '') {
      searchResults.value = {};
      return;
    }

    if (cleanQuery.length < 1) return;

    addToHistory(cleanQuery);

    isLoading.value = true;
    try {
      let endpointsToSearch = returnEndPoints.value;

      if (
        parsedQuery.value.filter &&
        parsedQuery.value.filter !== 'quickActions' &&
        parsedQuery.value.filter !== 'help'
      ) {
        endpointsToSearch = returnEndPoints.value.filter(
          (ep) => ep.slug === parsedQuery.value.filter
        );
      }

      const searchPromises = endpointsToSearch.map(
        ({ name, endpoint, searchParam, slug }) =>
          lmnFetch({
            endpoint,
            params: {
              [searchParam]: cleanQuery,
              per_page: 5,
              context: 'view',
              author: appStore.state.canManageOptions
                ? ''
                : appStore.state.userID,
              _embed: true,
            },
          }).then((response) => ({ slug, data: response.data }))
      );

      const results = await Promise.all(searchPromises);

      results.forEach(({ slug, data }) => {
        searchResults.value[slug] = data;
      });
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedSearch = debounce(performSearch, SEARCH_DEBOUNCE_DELAY);

  /**
   * Resets search state
   */
  const resetSearch = () => {
    searchQuery.value = '';
    searchResults.value = {};
    activeResultIndex.value = 0;
    showHistoryDropdown.value = false;
  };

  // Watch for query changes
  watch(searchQuery, (newValue, oldValue) => {
    if (newValue !== oldValue) {
      debouncedSearch();
      activeResultIndex.value = 0;
      showHistoryDropdown.value = false;
    }
  });

  // Update menu results when query changes
  watch(
    () => parsedQuery.value.cleanQuery,
    () => {
      searchResults.value.menu = returnAdminMenuLinks.value;
    }
  );

  return {
    searchQuery,
    searchResults,
    isLoading,
    activeResultIndex,
    showHistoryDropdown,
    parsedQuery,
    commandFilter,
    filteredSearchResults,
    returnEndPoints,
    returnCategoryName,
    returnAdminMenuLinks,
    performSearch,
    resetSearch,
    searchHistory,
    addToHistory,
    clearHistory,
    trackAccess,
    getFilteredRecentlyAccessed,
    getFilteredFrequentlyUsed,
  };
};
