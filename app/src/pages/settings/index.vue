<script setup>
import { ref, watch, nextTick, computed, watchEffect, onMounted } from 'vue';
import { ShadowRoot } from 'vue-shadow-dom';
import { useRoute } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { isObject } from '@/assets/js/functions/isObject.js';
import { notify } from '@/assets/js/functions/notify.js';
import { hexToRgb } from '@/assets/js/functions/hexToRgb.js';
import { isNonProduction } from '@/assets/js/functions/isNonProduction.js';
import { useDarkMode } from './src/useDarkMode.js';
import { generateColorScheme } from './src/generateColorScheme.js';
import { settingsConfig } from './src/settings-config.js';
const { isDark } = useDarkMode();

// Comps
import Notifications from '@/components/utility/notifications/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import SettingsPanel from './src/settings-panel.vue';
import Drawer from '@/components/utility/drawer/index.vue';

// Refs
const route = useRoute();
const adoptedStyleSheets = ref(new CSSStyleSheet());
const loading = ref(false);
const saving = ref(false);
const selectedCategory = ref('general');
const flexify_dashboard_settings = ref({});
const originalSettings = ref({});
const settingsFetched = ref(false);
const settingsUploader = ref(null);
const drawer = ref(null);
const searchQuery = ref('');

const settingsCategories = [
  {
    value: 'general',
    label: __('General', 'flexify-dashboard'),
    icon: 'settings',
    description: __('Core plugin settings and license management', 'flexify-dashboard'),
  },
  {
    value: 'login',
    label: __('Login', 'flexify-dashboard'),
    icon: 'login',
    description: __('Customize login page appearance and security', 'flexify-dashboard'),
  },
  {
    value: 'theme',
    label: __('Theme', 'flexify-dashboard'),
    icon: 'palette',
    description: __('Colors, styling, and visual customization', 'flexify-dashboard'),
  },
  {
    value: 'whitelabel',
    label: __('White Label', 'flexify-dashboard'),
    icon: 'diamond_shine',
    description: __(
      'Rebrand and customize interface text and icons',
      'flexify-dashboard'
    ),
  },
  {
    value: 'menu',
    label: __('Menu', 'flexify-dashboard'),
    icon: 'menu',
    description: __('Admin menu behavior and interaction settings', 'flexify-dashboard'),
  },
  {
    value: 'posts',
    label: __('Posts', 'flexify-dashboard'),
    icon: 'article',
    description: __('Post management and display preferences', 'flexify-dashboard'),
  },
  {
    value: 'plugins',
    label: __('Plugins', 'flexify-dashboard'),
    icon: 'extension',
    description: __('Plugin management interface options', 'flexify-dashboard'),
  },
  {
    value: 'dashboard',
    label: __('Dashboard', 'flexify-dashboard'),
    icon: 'dashboard',
    description: __(
      'Custom dashboard and admin interface settings',
      'flexify-dashboard'
    ),
  },
  {
    value: 'analytics',
    label: __('Analytics', 'flexify-dashboard'),
    icon: 'analytics',
    description: __('Built-in analytics and tracking settings', 'flexify-dashboard'),
  },
  {
    value: 'integrations',
    label: __('Integrations', 'flexify-dashboard'),
    icon: 'api',
    description: __('Configure external services and API keys', 'flexify-dashboard'),
  },
  {
    value: 'media',
    label: __('Media', 'flexify-dashboard'),
    icon: 'image',
    description: __('Media library and upload management settings', 'flexify-dashboard'),
  },
  {
    value: 'users',
    label: __('Users', 'flexify-dashboard'),
    icon: 'people',
    description: __('User management and administration settings', 'flexify-dashboard'),
  },
  {
    value: 'comments',
    label: __('Comments', 'flexify-dashboard'),
    icon: 'comment',
    description: __(
      'Comment management and administration settings',
      'flexify-dashboard'
    ),
  },
  {
    value: 'security',
    label: __('Security', 'flexify-dashboard'),
    icon: 'security',
    description: __('Security settings and administration', 'flexify-dashboard'),
  },
  {
    value: 'database',
    label: __('Database', 'flexify-dashboard'),
    icon: 'database',
    description: __('Database explorer and management settings', 'flexify-dashboard'),
  },
];

// Function to get query parameter (with URL decoding)
const getQueryParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(param);
  return value ? decodeURIComponent(value) : value;
};

// Function to set query parameter (with URL encoding)
const setQueryParam = (param, value) => {
  const url = new URL(window.location);
  if (value) {
    url.searchParams.set(param, encodeURIComponent(value));
  } else {
    url.searchParams.delete(param);
  }
  window.history.replaceState({}, '', url);
};

/**
 * Filters settings based on search query
 * @returns {Array} Filtered settings array with match information
 */
const filteredSettings = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return [];
  }

  const query = searchQuery.value.toLowerCase().trim();
  const matches = [];

  settingsConfig.forEach((setting) => {
    const labelMatch = setting.label?.toLowerCase().includes(query);
    const descriptionMatch = setting.description?.toLowerCase().includes(query);
    const idMatch = setting.id?.toLowerCase().includes(query);

    if (labelMatch || descriptionMatch || idMatch) {
      matches.push({
        ...setting,
        matchType: labelMatch
          ? 'label'
          : descriptionMatch
          ? 'description'
          : 'id',
      });
    }
  });

  return matches;
});

/**
 * Gets categories that contain matching settings
 * @returns {Set} Set of category values that have matching settings
 */
const categoriesWithMatches = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return new Set();
  }

  return new Set(filteredSettings.value.map((setting) => setting.category));
});

/**
 * Filters categories based on search query
 * Includes categories that match directly OR contain matching settings
 * @returns {Array} Filtered categories array with match indicators
 */
const filteredCategories = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return settingsCategories.map((cat) => ({
      ...cat,
      hasMatchingSettings: false,
    }));
  }

  const query = searchQuery.value.toLowerCase().trim();

  return settingsCategories
    .map((category) => {
      const labelMatch = category.label.toLowerCase().includes(query);
      const descriptionMatch = category.description
        .toLowerCase()
        .includes(query);
      const valueMatch = category.value.toLowerCase().includes(query);
      const hasMatchingSettings = categoriesWithMatches.value.has(
        category.value
      );

      const categoryMatches = labelMatch || descriptionMatch || valueMatch;

      if (categoryMatches || hasMatchingSettings) {
        return {
          ...category,
          hasMatchingSettings,
          matchCount: hasMatchingSettings
            ? filteredSettings.value.filter(
                (s) => s.category === category.value
              ).length
            : 0,
        };
      }

      return null;
    })
    .filter(Boolean);
});

// Function to update query parameter
const updateQueryParam = (category) => {
  const currentCategory = getQueryParam('category');

  // Only update if the query actually changed
  if (currentCategory !== category) {
    setQueryParam('category', category);
  }
};

// Watch selectedCategory and update query param
watch(
  selectedCategory,
  (newCategory) => {
    updateQueryParam(newCategory);
  },
  { immediate: false }
);

// Select category from query param
watch(
  () => route?.query,
  () => {
    const queryCategory = getQueryParam('category');
    if (
      queryCategory &&
      settingsCategories.find((c) => c.value === queryCategory)
    ) {
      selectedCategory.value = queryCategory;
    }
  },
  { immediate: true }
);

/**
 * Fetches site settings from the server
 */
const getSettings = async () => {
  appStore.updateState('loading', true);
  loading.value = true;

  const args = { endpoint: 'wp/v2/settings', params: {} };
  const response = await lmnFetch(args);

  appStore.updateState('loading', false);
  loading.value = false;

  if (!response) return;

  if (
    !response.data.flexify_dashboard_settings ||
    !isObject(response.data.flexify_dashboard_settings)
  )
    return;

  flexify_dashboard_settings.value = response.data.flexify_dashboard_settings;

  if (flexify_dashboard_settings.value.custom_css) {
    flexify_dashboard_settings.value.custom_css = decodeHTMLEntities(
      flexify_dashboard_settings.value.custom_css
    );
  }

  originalSettings.value = JSON.parse(
    JSON.stringify(response.data.flexify_dashboard_settings)
  );

  nextTick(() => {
    settingsFetched.value = true;
  });
};

// Helper function to decode HTML entities
const decodeHTMLEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Updates the site settings on the server
 * 
 * Note: google_analytics_service_account is excluded from the payload
 * because it's managed by a separate secure endpoint that handles encryption.
 * Including it here would overwrite the encrypted value with stale/empty data.
 */
const updateSettings = async () => {
  appStore.updateState('loading', true);
  saving.value = true;

  // Create a copy of settings and exclude fields managed by separate endpoints
  const settingsCopy = JSON.parse(JSON.stringify(flexify_dashboard_settings.value));
  
  // Remove google_analytics_service_account - it's saved via dedicated endpoint
  // with encryption and should not be overwritten by the main settings save
  delete settingsCopy.google_analytics_service_account;
  delete settingsCopy.google_recaptcha_secret_key;

  let payload = {
    flexify_dashboard_settings: settingsCopy,
  };

  const args = {
    endpoint: 'wp/v2/settings',
    type: 'POST',
    params: {},
    data: payload,
  };
  const response = await lmnFetch(args);

  appStore.updateState('loading', false);
  saving.value = false;

  if (!response) return;

  notify({ title: __('Settings updated!', 'flexify-dashboard'), type: 'success' });
  appStore.updateState('flexify_dashboard_settings', flexify_dashboard_settings.value);
};

const exportSettings = () => {
  let payload = {
    flexify_dashboard_settings: JSON.parse(JSON.stringify(flexify_dashboard_settings.value)),
  };

  delete payload.flexify_dashboard_settings.license_key;
  delete payload.flexify_dashboard_settings.instance_id;
  delete payload.flexify_dashboard_settings.google_analytics_service_account;
  delete payload.flexify_dashboard_settings.google_recaptcha_secret_key;

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `flexify-dashboard-settings.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const handleSettingsFileUpload = async (event) => {
  const file = event.target.files[0];
  try {
    await importFromSettingJSON(file);
    notify({ type: 'success', title: __('Settings imported', 'flexify-dashboard') });
  } catch (error) {
    notify({ type: 'error', title: __('Import failed', 'flexify-dashboard') });
  }
};

const importFromSettingJSON = async (file) => {
  try {
    if (!file || !(file instanceof File)) {
      notify({
        type: 'error',
        title: __('Please provide a valid JSON file', 'flexify-dashboard'),
      });
      return;
    }

    const fileContent = await file.text();
    const jsonData = JSON.parse(fileContent);

    if (!jsonData.flexify_dashboard_settings) {
      notify({
        type: 'error',
        title: __('Invalid settings: must be an object', 'flexify-dashboard'),
      });
      return;
    }

    if (
      typeof jsonData.flexify_dashboard_settings !== 'object' ||
      jsonData.flexify_dashboard_settings === null
    ) {
      notify({
        type: 'error',
        title: __('Invalid settings: must be an object', 'flexify-dashboard'),
      });
      return;
    }

    flexify_dashboard_settings.value = {
      ...flexify_dashboard_settings.value,
      ...jsonData.flexify_dashboard_settings,
    };
    return true;
  } catch (error) {
    notify({
      type: 'error',
      title: __('Error uploading settings', 'flexify-dashboard'),
    });
    throw error;
  }
};

const normalizeColorScale = (scale) => {
	if (Array.isArray(scale)) {
		return scale;
	}

	if (isObject(scale)) {
		return Object.values(scale);
	}

	return [];
};

const updateCssProperties = (cssvalues, colorName) => {
	const normalizedScale = normalizeColorScale(cssvalues);

	for (let color of normalizedScale) {
		if (!isObject(color) || !color.color || color.step === undefined) {
			continue;
		}

		const hexArray = hexToRgb(color.color);
		const variableName = `--fd-${colorName}-${color.step}`;
		
		document.documentElement.style.setProperty(
			variableName,
			hexArray.join(' ')
		);
	}
};

onMounted(() => {
  // Initialize selectedCategory from query param on mount
  const queryCategory = getQueryParam('category');
  if (
    queryCategory &&
    settingsCategories.find((c) => c.value === queryCategory)
  ) {
    selectedCategory.value = queryCategory;
  }
});

/* Base color watchers */
watch(
  () => flexify_dashboard_settings.value.base_theme_color,
  () => {
    if (!settingsFetched.value || !flexify_dashboard_settings.value.base_theme_color)
      return;
    flexify_dashboard_settings.value.base_theme_scale = generateColorScheme(
      flexify_dashboard_settings.value.base_theme_color
    );
    updateCssProperties(flexify_dashboard_settings.value.base_theme_scale, 'base');
  }
);

watch(
  () => flexify_dashboard_settings.value.base_theme_scale,
  () => {
    if (!settingsFetched.value) return;
    updateCssProperties(flexify_dashboard_settings.value.base_theme_scale, 'base');
  },
  { deep: true }
);

/* Accent color watchers */
watch(
  () => flexify_dashboard_settings.value.accent_theme_color,
  () => {
    if (!settingsFetched.value || !flexify_dashboard_settings.value.accent_theme_color)
      return;
    flexify_dashboard_settings.value.accent_theme_scale = generateColorScheme(
      flexify_dashboard_settings.value.accent_theme_color
    );
    updateCssProperties(flexify_dashboard_settings.value.accent_theme_scale, 'accent');
  }
);

watch(
  () => flexify_dashboard_settings.value.accent_theme_scale,
  () => {
    if (!settingsFetched.value) return;
    updateCssProperties(flexify_dashboard_settings.value.accent_theme_scale, 'accent');
  },
  { deep: true }
);

watch(
  () => flexify_dashboard_settings.value,
  () => {
    if (!settingsFetched.value) return;
    const settingsUpdateEvent = new CustomEvent('flexify-dashboard-settings-update', {
      detail: flexify_dashboard_settings.value,
    });
    document.dispatchEvent(settingsUpdateEvent);
  },
  { deep: true }
);

getSettings();
</script>

<template>
  <component is="style">html{font-size:14px;}#wpcontent{padding:0}</component>
  <div class="flexify-dashboard-isolation">
    <Notifications />

    <div
      class="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flexify-dashboard-normalize max-h-[var(--fd-body-height)] overflow-hidden gap-6 p-[1.5px]"
      :class="isDark ? 'dark' : ''"
    >
      <!-- Left Sidebar -->
      <div
        class="md:w-96 w-full flex flex-col bg-white dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700/20 overflow-hidden max-h-full"
      >
        <!-- Header -->
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <h1 class="text-xl font-medium grow">
              {{ __('Settings', 'flexify-dashboard') }}
            </h1>
            <div class="flex items-center">
              <AppButton
                type="transparent"
                @click="exportSettings"
                class="text-sm"
              >
                <AppIcon icon="download" class="text-xl" />
              </AppButton>
              <AppButton
                type="transparent"
                @click="settingsUploader.click()"
                class="text-sm"
              >
                <AppIcon icon="upload" class="text-xl" />
                <input
                  type="file"
                  accept=".json"
                  @change="handleSettingsFileUpload"
                  class="hidden"
                  ref="settingsUploader"
                />
              </AppButton>
            </div>
          </div>

          <!-- Search Input -->
          <div class="relative mb-4">
            <div
              class="absolute top-0 left-0 h-full flex items-center px-3 pointer-events-none"
            >
              <AppIcon icon="search" class="text-zinc-400 text-sm" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="__('Search settings...', 'flexify-dashboard')"
              class="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700/40 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs focus:bg-white dark:focus:bg-zinc-800"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute top-0 right-0 h-full flex items-center px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <AppIcon icon="close" class="text-sm" />
            </button>
          </div>
        </div>

        <!-- Categories List -->
        <div class="flex-1 overflow-auto">
          <div
            v-if="loading && !settingsCategories.length"
            class="p-8 text-center"
          >
            <div
              class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
            >
              <AppIcon
                icon="settings"
                class="text-zinc-400 text-xl animate-pulse"
              />
            </div>
            <p class="text-sm text-zinc-500">
              {{ __('Loading settings...', 'flexify-dashboard') }}
            </p>
          </div>

          <div v-else class="py-2 px-6 flex flex-col gap-1">
            <!-- No Results Message -->
            <div
              v-if="filteredCategories.length === 0"
              class="py-8 text-center"
            >
              <div
                class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <AppIcon icon="search" class="text-zinc-400 text-xl" />
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                {{ __('No settings found', 'flexify-dashboard') }}
              </p>
              <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {{ __('Try a different search term', 'flexify-dashboard') }}
              </p>
            </div>

            <!-- Categories List -->
            <div
              v-for="category in filteredCategories"
              :key="category.value"
              @click="
                selectedCategory = category.value;
                drawer = true;
              "
              class="flex items-center gap-3 px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer group"
              :class="
                selectedCategory === category.value
                  ? 'bg-zinc-100 dark:bg-zinc-800/60'
                  : ''
              "
            >
              <!-- Category Icon -->
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center"
                  :class="
                    selectedCategory === category.value
                      ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  "
                >
                  <AppIcon :icon="category.icon" class="text-lg" />
                </div>
              </div>

              <!-- Category Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span
                    class="font-medium text-sm truncate"
                    :class="
                      selectedCategory === category.value
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-500 dark:text-zinc-400'
                    "
                  >
                    {{ category.label }}
                  </span>
                  <span
                    v-if="category.hasMatchingSettings && category.matchCount"
                    class="px-1.5 py-0.5 text-xs font-medium rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400"
                  >
                    {{ category.matchCount }}
                  </span>
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {{ category.description }}
                </div>
              </div>

              <!-- Arrow indicator -->
              <div
                class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <AppIcon icon="chevron_right" class="text-zinc-400 text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Content Area -->
      <div
        class="flex-1 flex flex-col bg-white dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-700/20"
      >
        <!-- Loading State -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon
                icon="settings"
                class="text-2xl text-zinc-400 animate-pulse"
              />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Loading Settings...', 'flexify-dashboard') }}
            </h3>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!selectedCategory"
          class="flex-1 flex items-center justify-center"
        >
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="settings" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Settings Panel', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 mb-4">
              {{
                __(
                  'Select a category from the list to configure your settings.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>

        <!-- Settings Panel -->
        <div
          v-else
          class="flex-1 flex flex-col hidden md:flex max-h-full overflow-y-auto"
        >
          <SettingsPanel
            v-model="flexify_dashboard_settings"
            :tab="selectedCategory"
            :saving="saving"
            :categories="settingsCategories"
            :searchQuery="searchQuery"
            @save="updateSettings"
          />
        </div>

        <!-- Mobile Drawer -->
        <Drawer v-model="drawer" class="md:hidden" :showHeader="false">
          <SettingsPanel
            v-model="flexify_dashboard_settings"
            :tab="selectedCategory"
            :saving="saving"
            :categories="settingsCategories"
            :searchQuery="searchQuery"
            @save="updateSettings"
          />
        </Drawer>
      </div>
    </div>
  </div>
</template>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
