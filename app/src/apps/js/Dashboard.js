import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createWebHashHistory, createRouter } from 'vue-router';
import '@/apps/css/dashboard.css';

// Import store
import { useAppStore } from '@/store/app/app.js';
import {
  setGlobalProperties,
  setVueGlobalProperties,
} from '@/setup/setGlobalProperties.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

// Import comps
import AppWrapper from '@/pages/dashboard/index.vue';

// Build app
const app = createApp(AppWrapper);

// Use pinia
const pinia = createPinia();
app.use(pinia);

// Update app store
const appStore = useAppStore();
setGlobalProperties(appStore, '#fd-script', '#fd-dashboard-script');

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
      const currentUser = appStore.state.currentUser || {};
      const updatedUser = {
        ...currentUser,
        allcaps: response.data.allcaps,
      };
      appStore.updateState('currentUser', updatedUser);
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

// Fetch capabilities asynchronously
fetchUserCapabilities();

// Declare translation functions
setVueGlobalProperties(app);

app.mount('#fd-dashboard-page');
