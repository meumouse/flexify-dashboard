<script setup>
import {
  ref,
  watch,
  nextTick,
  computed,
  watchEffect,
  defineAsyncComponent,
  defineProps,
  defineEmits,
} from 'vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { isNonProduction } from '@/assets/js/functions/isNonProduction.js';

// Settings config
import { getSettingsForCategory } from './settings-config.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import SettingField from './setting-field.vue';
import Confirm from '@/components/utility/confirm/index.vue';

// Custom render components
import LicenseKey from './custom-renders/license-key.vue';
import LayoutSelector from './custom-renders/layout-selector.vue';
import ColorScale from './custom-renders/color-scale.vue';
import CodeEditorRender from './custom-renders/code-editor.vue';
import ExternalStylesheets from './custom-renders/external-stylesheets.vue';
import TextPairsRender from './custom-renders/text-pairs.vue';
import RemoteSitesSection from './sections/RemoteSitesSection.vue';
import FontSelector from './custom-renders/font-selector.vue';
import GoogleAnalyticsConnection from './custom-renders/google-analytics-connection.vue';
import GoogleRecaptchaConnection from './custom-renders/google-recaptcha-connection.vue';

// Refs
const props = defineProps(['tab', 'categories', 'saving', 'searchQuery']);
const flexify_dashboard_settings = defineModel();
const emits = defineEmits(['save']);
const newKey = ref('');
const keyactions = ref(false);
const saving = ref(false);
const confirm = ref(null);
const submenuStyles = {
  click: { value: 'click', label: __('Click', 'flexify-dashboard') },
  hover: { value: 'hover', label: __('Hover', 'flexify-dashboard') },
};
const forceGlobalThemeOptions = {
  off: { value: 'off', label: __('Off', 'flexify-dashboard') },
  light: { value: 'light', label: __('Light', 'flexify-dashboard') },
  dark: { value: 'dark', label: __('Dark', 'flexify-dashboard') },
};

// Helper function to decode HTML entities
const decodeHTMLEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Updates the site settings on the server and in the local application state.
 *
 * This function performs the following operations:
 * 1. Sets the application loading state and local saving state to true.
 * 2. Creates a payload with the current flexify_dashboard_settings.
 * 3. Sends a POST request to the 'wp/v2/settings' endpoint with the payload.
 * 4. Updates the application loading state and local saving state to false.
 * 5. If the update is successful, it notifies the user and updates the application state.
 *
 * Note: google_analytics_service_account is excluded from the payload
 * because it's managed by a separate secure endpoint that handles encryption.
 *
 * @async
 * @function updateSettings
 * @returns {Promise<void>}
 * @throws Will not throw, but will return early if the response is invalid.
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

  // Something went wrong
  if (!response) return;

  notify({ title: __('Settings updated!', 'flexify-dashboard'), type: 'success' });

  appStore.updateState('flexify_dashboard_settings', flexify_dashboard_settings.value);
};

/**
 * Routes license activation to the appropriate service based on key prefix.
 * Keys starting with "UIXP-" use Polar.sh, others use LemonSqueezy.
 *
 * @async
 * @function activateLicence
 * @returns {Promise<void>}
 */
const activateLicence = async () => {
  await activateLicenseKey();
};

/**
 * Activates a license key for the application using the new API endpoint.
 *
 * This function performs the following operations:
 * 1. Sets the application loading state and keyactions state to true.
 * 2. Prepares a payload with the license key and instance ID (hostname).
 * 3. Sends a POST request to 'accounts.uipress.co/api/v1/keys/validate-activate' endpoint.
 * 4. If activation is successful, updates the local settings with the new key and activation ID.
 * 5. Calls updateSettings to save the new license information.
 *
 * @async
 * @function activateLicenseKey
 * @returns {Promise<void>}
 * @throws Will not throw, but will notify the user of errors and return early if the response is invalid.
 */
const activateLicenseKey = async () => {
  appStore.updateState('loading', true);
  keyactions.value = true;

  const payload = {
    data: {
      license_key: newKey.value.trim(),
      instance_id: window.location.hostname,
    },
  };

  try {
    const response = await fetch(
      'https://accounts.uipress.co/api/v1/keys/validate-activate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    appStore.updateState('loading', false);
    keyactions.value = false;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      notify({
        title: errorData.message || __('Failed to activate key', 'flexify-dashboard'),
        type: 'error',
      });
      return;
    }

    const result = await response.json();

    console.log(result);

    if (result.error) {
      notify({
        title: result.message || __('Failed to activate key', 'flexify-dashboard'),
        type: 'error',
      });
      return;
    }

    if (result.success) {
      notify({
        title: result.existing
          ? __('Key already activated for this site', 'flexify-dashboard')
          : __('Key successfully activated', 'flexify-dashboard'),
        type: 'success',
      });

      flexify_dashboard_settings.value.license_key = newKey.value.trim();
      flexify_dashboard_settings.value.instance_id = result.activation_id;

      updateSettings();
    }
  } catch (error) {
    appStore.updateState('loading', false);
    keyactions.value = false;

    notify({
      title: __('Network error during activation', 'flexify-dashboard'),
      type: 'error',
    });
  }
};

/**
 * Validates the current license key using the new API endpoint.
 * Uses the validate-activate endpoint which returns existing activation if already activated.
 *
 * @async
 * @function validateLicence
 * @returns {Promise<void>}
 */
const validateLicence = async () => {
  // Nothing to validate
  if (
    !flexify_dashboard_settings.value.license_key ||
    !flexify_dashboard_settings.value.instance_id
  ) {
    return;
  }

  // Skip validation for Polar.sh keys
  if (flexify_dashboard_settings.value.license_key.startsWith('UIXP-')) {
    return;
  }

  const payload = {
    data: {
      license_key: flexify_dashboard_settings.value.license_key,
      instance_id: flexify_dashboard_settings.value.instance_id,
    },
  };

  try {
    const response = await fetch(
      'https://accounts.uipress.co/api/v1/keys/validate-activate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // Validation failed - key might be invalid
      return;
    }

    const result = await response.json();

    if (result.error) {
      // Key is invalid or activation limit reached
      // Could notify user or handle error state here if needed
      return;
    }

    if (result.success) {
      // License is valid and activated
      // Optionally update instance_id if it changed
      if (
        result.activation_id &&
        result.activation_id !== flexify_dashboard_settings.value.instance_id
      ) {
        flexify_dashboard_settings.value.instance_id = result.activation_id;
        updateSettings();
      }
    }
  } catch (error) {
    // Network error - silently fail validation
    console.error('License validation error:', error);
  }
};

/**
 * Removes (deactivates) the current license key using the new API endpoint.
 *
 * This function performs the following operations:
 * 1. Sets the application loading state and keyactions state to true.
 * 2. Prepares a payload with the current license key and instance ID.
 * 3. Sends a POST request to 'accounts.uipress.co/api/v1/keys/remove-activation' endpoint.
 * 4. Clears the license key and instance ID from the local settings.
 * 5. Calls updateSettings to save the changes.
 * 6. Notifies the user of successful removal.
 *
 * @async
 * @function removeKey
 * @returns {Promise<void>}
 * @throws Will not throw, but will return early if the response is invalid.
 */
const removeKey = async () => {
  appStore.updateState('loading', true);
  keyactions.value = true;

  // Handle Polar.sh keys (no API call needed)
  if (flexify_dashboard_settings.value.license_key?.startsWith('UIXP-')) {
    flexify_dashboard_settings.value.license_key = '';
    flexify_dashboard_settings.value.instance_id = '';
    newKey.value = '';
    emits('save');
    appStore.updateState('loading', false);
    keyactions.value = false;
    notify({ title: __('Instance removed', 'flexify-dashboard'), type: 'success' });
    return;
  }

  const payload = {
    data: {
      license_key: flexify_dashboard_settings.value.license_key,
      instance_id: flexify_dashboard_settings.value.instance_id,
    },
  };

  try {
    const response = await fetch(
      'https://accounts.uipress.co/api/v1/keys/remove-activation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    appStore.updateState('loading', false);
    keyactions.value = false;

    // Clear settings regardless of response
    flexify_dashboard_settings.value.license_key = '';
    flexify_dashboard_settings.value.instance_id = '';
    newKey.value = '';

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      notify({
        title:
          errorData.message || __('Failed to remove activation', 'flexify-dashboard'),
        type: 'error',
      });
      // Still update settings to clear local state
      nextTick(() => {
        updateSettings();
      });
      return;
    }

    const result = await response.json();

    if (result.error) {
      notify({
        title: result.message || __('Failed to remove activation', 'flexify-dashboard'),
        type: 'error',
      });
    } else {
      notify({ title: __('Instance removed', 'flexify-dashboard'), type: 'success' });
    }

    nextTick(() => {
      updateSettings();
    });
  } catch (error) {
    appStore.updateState('loading', false);
    keyactions.value = false;

    // Clear settings even on error
    flexify_dashboard_settings.value.license_key = '';
    flexify_dashboard_settings.value.instance_id = '';
    newKey.value = '';

    notify({
      title: __('Network error during removal', 'flexify-dashboard'),
      type: 'error',
    });

    nextTick(() => {
      updateSettings();
    });
  }
};

const isActivated = computed(() => {
  if (isNonProduction()) return true;

  if (
    flexify_dashboard_settings.value.license_key &&
    flexify_dashboard_settings.value.instance_id
  ) {
    return true;
  }

  return false;
});

/**
 * Get settings for the current tab
 */
const allSettingsForTab = computed(() => {
  return getSettingsForCategory(
    props.tab,
    flexify_dashboard_settings.value,
    isActivated.value
  );
});

/**
 * Filter settings based on search query
 */
const currentSettings = computed(() => {
  const settings = allSettingsForTab.value;

  if (!props.searchQuery || !props.searchQuery.trim()) {
    return settings;
  }

  const query = props.searchQuery.toLowerCase().trim();

  return settings.filter((setting) => {
    const labelMatch = setting.label?.toLowerCase().includes(query);
    const descriptionMatch = setting.description?.toLowerCase().includes(query);
    const idMatch = setting.id?.toLowerCase().includes(query);

    return labelMatch || descriptionMatch || idMatch;
  });
});

/**
 * Custom render handlers for special cases
 */
const customHandlers = {
  'license-key': LicenseKey,
  'layout-selector': LayoutSelector,
  'color-scale': ColorScale,
  'code-editor': CodeEditorRender,
  'external-stylesheets': ExternalStylesheets,
  'text-pairs': TextPairsRender,
  'remote-sites': RemoteSitesSection,
  'font-selector': FontSelector,
  'google-analytics-connection': GoogleAnalyticsConnection,
  'google-recaptcha-connection': GoogleRecaptchaConnection,
};

/**
 * Handle license activation
 */
const handleActivateLicense = async (key) => {
  newKey.value = key;
  await activateLicence();
};
</script>

<template>
  <div class="grid grid-cols-3 gap-12 p-6">
    <div
      class="col-span-3 p-6 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl flex flex-row justify-between items-center"
    >
      <div class="">
        <h1 class="text-zinc-900 dark:text-zinc-100 font-semibold text-2xl">
          {{ categories.find((category) => category.value == tab).label }}
        </h1>
        <p class="text-zinc-500 dark:text-zinc-400">
          {{ categories.find((category) => category.value == tab).description }}
        </p>
      </div>
      <AppButton type="primary" @click="emits('save')" :loading="saving">
        {{ __('Save', 'flexify-dashboard') }}
      </AppButton>
    </div>

    <div class="grid grid-cols-3 gap-12 p-6 col-span-3 pl-6">
      <!-- License activation notice -->
      <div
        v-if="!isActivated && tab !== 'general'"
        class="bg-emerald-100 dark:bg-emerald-600/20 border border-emerald-400 dark:border-emerald-700 p-2 rounded-lg text-sm mt-3 col-span-3"
      >
        {{
          __(
            'Please add your licence key to unlock the plugin settings',
            'flexify-dashboard'
          )
        }}
      </div>

      <!-- Search Results Info -->
      <div
        v-if="searchQuery && searchQuery.trim() && currentSettings.length > 0"
        class="col-span-3 mb-4 px-2"
      >
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Found', 'flexify-dashboard') }}
          <span class="font-medium text-zinc-900 dark:text-zinc-100">
            {{ currentSettings.length }}
          </span>
          {{ __('matching setting(s)', 'flexify-dashboard') }}
        </p>
      </div>

      <!-- No Search Results -->
      <div
        v-if="searchQuery && searchQuery.trim() && currentSettings.length === 0"
        class="col-span-3 py-12 text-center"
      >
        <div
          class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <AppIcon icon="search" class="text-2xl text-zinc-400" />
        </div>
        <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          {{ __('No settings found', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
          {{
            __('No settings match your search in this category.', 'flexify-dashboard')
          }}
        </p>
        <p class="text-xs text-zinc-400 dark:text-zinc-500">
          {{
            __(
              'Try a different search term or check another category.',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>

      <!-- Dynamic Settings Rendering -->
      <template v-for="setting in currentSettings" :key="setting.id">
        <!-- License Key - Special handling -->
        <template v-if="setting.customRender === 'license-key'">
          <div class="flex flex-col pt-2 gap-2">
            <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
              setting.label
            }}</span>
            <span class="text-zinc-500 dark:text-zinc-400 leading-snug">{{
              setting.description
            }}</span>
          </div>
          <component
            :is="customHandlers[setting.customRender]"
            :model-value="flexify_dashboard_settings"
            :on-activate="handleActivateLicense"
            :on-remove="removeKey"
            :keyactions="keyactions"
            class="col-span-2"
          />
          <div
            class="border-t border-zinc-200 dark:border-zinc-800 col-span-3"
          ></div>
        </template>

        <!-- Code Editor - Special handling with save button -->
        <template v-else-if="setting.customRender === 'code-editor'">
          <div class="flex flex-col pt-2 gap-2">
            <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
              setting.label
            }}</span>
            <span class="text-zinc-500 dark:text-zinc-400 leading-snug">{{
              setting.description
            }}</span>
          </div>
          <component
            :is="customHandlers[setting.customRender]"
            :setting="setting"
            :model-value="flexify_dashboard_settings"
            :on-save="updateSettings"
            :saving="saving"
            @update:model-value="flexify_dashboard_settings = $event"
          />
          <div
            class="border-t border-zinc-200 dark:border-zinc-800 col-span-3"
          ></div>
        </template>

        <!-- Remote Sites - Special handling -->
        <template v-else-if="setting.customRender === 'remote-sites'">
          <div class="flex flex-col pt-2 gap-2">
            <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{
              setting.label
            }}</span>
            <span class="text-zinc-500 dark:text-zinc-400 leading-snug">{{
              setting.description
            }}</span>
          </div>
          <component
            :is="customHandlers[setting.customRender]"
            :settings="flexify_dashboard_settings"
            :confirm="(opts) => confirm?.show(opts)"
            @update:settings="flexify_dashboard_settings = $event"
            class="col-span-2"
          />
          <div
            class="border-t border-zinc-200 dark:border-zinc-800 col-span-3"
          ></div>
        </template>

        <!-- Standard Setting Field -->
        <SettingField
          v-else
          :setting="setting"
          :model-value="flexify_dashboard_settings"
          :custom-handlers="customHandlers"
          @update:model-value="flexify_dashboard_settings = $event"
        />
      </template>
    </div>

    <Confirm ref="confirm" />
  </div>
</template>
