import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

/**
 * Set's app defaults
 *
 */
const state = ref({
  loading: false,
  adminUrl: false,
  pluginBase: false,
  restNonce: null,
  restBase: null,
  store_id: null,
  currentStore: {},
  fullScreen: false,
  currentPageName: '',
  menu_minimised: false,
  initialised: false,
});

export const useAppStore = defineStore('app', () => {
  persist: true;

  /**
   * Handles state update
   *
   * @param {string} key
   * @param {mixed} value
   */
  const updateState = (key, value) => {
    state.value[key] = value;
  };

  /**
   * Checks for menu state
   */
  const menuState = localStorage.getItem('fd-menu-state');
  if (menuState) {
    state.value.menu_minimised = JSON.parse(menuState);
  }

  /**
   * Fetches user capabilities from REST API and caches them in the store
   */
  const fetchUserCapabilities = async () => {
    try {
      const response = await lmnFetch({
        endpoint: 'flexify-dashboard/v1/user-capabilities',
        type: 'GET',
      });

      // Check if response exists and has data
      if (response && response.data && response.data.allcaps) {
        // Merge capabilities into existing currentUser object
        const currentUser = state.value.currentUser || {};
        const updatedUser = {
          ...currentUser,
          allcaps: response.data.allcaps,
        };
        updateState('currentUser', updatedUser);
      } else {
        // Silently fail if endpoint doesn't exist or returns error
        // This is expected for remote sites that may not have UiXpress installed
        console.warn(
          'User capabilities endpoint not available or returned no data'
        );
      }
    } catch (error) {
      // Silently handle errors - this is expected for remote sites
      // that may not have the UiXpress plugin installed
      console.warn(
        'Failed to fetch user capabilities (this is normal for remote sites without UiXpress):',
        error
      );
    }
  };

  watch(
    () => state.value.menu_minimised,
    () => {
      localStorage.setItem(
        'fd-menu-state',
        JSON.stringify(state.value.menu_minimised)
      );
    }
  );

  watch(
    () => state.value.restNonce,
    () => {
      if (state.value.restNonce) {
        fetchUserCapabilities();
      }
    }
  );

  return { state, updateState };
});
