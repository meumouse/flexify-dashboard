<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import StatusTag from '@/components/utility/status-tag/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  setting: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

// State
const loading = ref(false);
const saving = ref(false);
const disconnecting = ref(false);
const loadingProperties = ref(false);
const status = ref(null);
const properties = ref([]);
const selectedProperty = ref('');
const manualPropertyId = ref('');
const serviceAccountJson = ref('');
const showCredentialsForm = ref(false);
const showInstructions = ref(false);
const showManualEntry = ref(false);
const propertiesError = ref('');
const connectionError = ref(null);

// Computed
const isConnected = computed(() => {
  return status.value?.connected === true;
});

const isConfigured = computed(() => {
  return status.value?.configured === true;
});

/**
 * Check connection status
 */
const checkStatus = async () => {
  loading.value = true;
  connectionError.value = null;
  
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/status',
      type: 'GET',
    });

    if (response?.data) {
      status.value = response.data;
      selectedProperty.value = response.data.property_id || '';

      // If connected but no property selected, show manual entry
      if (response.data.connected && !response.data.property_id) {
        showManualEntry.value = true;
      }
      
      // If connected with property, test the connection
      if (response.data.connected && response.data.property_id) {
        await testConnection();
      }
    }
  } catch (error) {
    console.error('Failed to check GA status:', error);
  } finally {
    loading.value = false;
  }
};

/**
 * Test the connection by making a simple API call
 */
const testConnection = async () => {
  try {
    // Make a quick test request to check if the connection works
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/analytics/active-users',
      type: 'GET',
      params: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browser_time: new Date().toISOString(),
      },
    });
    
    // Check for permission errors
    if (response?.data?._error) {
      connectionError.value = response.data._error;
    } else {
      connectionError.value = null;
    }
  } catch (error) {
    console.error('Connection test failed:', error);
  }
};

/**
 * Save service account credentials
 */
const saveCredentials = async () => {
  if (!serviceAccountJson.value.trim()) {
    notify({
      title: __('Please paste your service account JSON key', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  saving.value = true;
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/credentials',
      type: 'POST',
      data: {
        service_account_json: serviceAccountJson.value,
      },
    });

    if (response?.data?.success) {
      notify({
        title: __('Service account connected successfully', 'flexify-dashboard'),
        type: 'success',
      });
      showCredentialsForm.value = false;
      serviceAccountJson.value = '';
      await checkStatus();
      await loadProperties();
    } else {
      notify({
        title: response?.data?.message || __('Failed to save credentials', 'flexify-dashboard'),
        type: 'error',
      });
    }
  } catch (error) {
    console.error('Save credentials error:', error);
    notify({
      title: __('Failed to save credentials', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    saving.value = false;
  }
};

/**
 * Load available GA4 properties
 */
const loadProperties = async () => {
  loadingProperties.value = true;
  propertiesError.value = '';
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/properties',
      type: 'GET',
    });

    if (response?.data?.properties) {
      properties.value = response.data.properties;
      selectedProperty.value = response.data.selected || '';
    } else if (response?.data?.message) {
      // API error - show manual entry option
      propertiesError.value = response.data.message;
      showManualEntry.value = true;
    }
  } catch (error) {
    console.error('Failed to load properties:', error);
    // On error, show manual entry option
    propertiesError.value = __('Could not load properties automatically. You can enter your Property ID manually below.', 'flexify-dashboard');
    showManualEntry.value = true;
  } finally {
    loadingProperties.value = false;
  }
};

/**
 * Save manually entered property ID
 */
const saveManualProperty = async () => {
  if (!manualPropertyId.value.trim()) {
    notify({
      title: __('Please enter a Property ID', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  // Clean the property ID (remove "properties/" prefix if present)
  let propertyId = manualPropertyId.value.trim();
  if (propertyId.startsWith('properties/')) {
    propertyId = propertyId.replace('properties/', '');
  }

  loading.value = true;
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/property',
      type: 'POST',
      data: { property_id: propertyId },
    });

    if (response?.data?.success) {
      notify({
        title: __('Property saved', 'flexify-dashboard'),
        type: 'success',
      });

      selectedProperty.value = propertyId;
      showManualEntry.value = false;

      // Update parent model
      const updated = { ...props.modelValue };
      updated.google_analytics_property_id = propertyId;
      emit('update:modelValue', updated);

      await checkStatus();
    }
  } catch (error) {
    console.error('Failed to save property:', error);
    notify({
      title: __('Failed to save property', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Save selected property
 */
const saveProperty = async () => {
  if (!selectedProperty.value) return;

  loading.value = true;
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/property',
      type: 'POST',
      data: { property_id: selectedProperty.value },
    });

    if (response?.data?.success) {
      notify({
        title: __('Property saved', 'flexify-dashboard'),
        type: 'success',
      });

      // Update parent model
      const updated = { ...props.modelValue };
      updated.google_analytics_property_id = selectedProperty.value;
      emit('update:modelValue', updated);

      await checkStatus();
    }
  } catch (error) {
    console.error('Failed to save property:', error);
    notify({
      title: __('Failed to save property', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Disconnect Google Analytics
 */
const disconnect = async () => {
  disconnecting.value = true;
  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/google-analytics/disconnect',
      type: 'POST',
    });

    if (response?.data?.success) {
      notify({
        title: __('Google Analytics disconnected', 'flexify-dashboard'),
        type: 'success',
      });

      // Clear local state
      status.value = null;
      properties.value = [];
      selectedProperty.value = '';
      serviceAccountJson.value = '';

      // Update parent model
      const updated = { ...props.modelValue };
      updated.google_analytics_property_id = '';
      emit('update:modelValue', updated);
    }
  } catch (error) {
    console.error('Disconnect error:', error);
    notify({
      title: __('Failed to disconnect', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    disconnecting.value = false;
  }
};

// Watch for property changes
watch(selectedProperty, (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    saveProperty();
  }
});

// Check status on mount
onMounted(() => {
  checkStatus();
});
</script>

<template>
  <div class="col-span-2">
    <!-- Loading State -->
    <div v-if="loading && !status" class="flex items-center gap-2">
      <div
        class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
      ></div>
      <span class="text-sm text-zinc-500">{{
        __('Checking connection...', 'flexify-dashboard')
      }}</span>
    </div>

    <!-- Connected State -->
    <div v-else-if="isConnected" class="space-y-4">
      <div class="flex items-center gap-3">
        <StatusTag
          :status="connectionError ? 'warning' : 'success'"
          :text="connectionError ? __('Connection Issue', 'flexify-dashboard') : __('Connected to Google Analytics', 'flexify-dashboard')"
        />
      </div>
      
      <!-- Connection Error Alert -->
      <div
        v-if="connectionError"
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
      >
        <div class="flex items-start gap-3">
          <AppIcon icon="warning" class="text-xl text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              {{ __('Permission Issue Detected', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mb-2">
              {{ connectionError.message }}
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <a
                v-if="connectionError.help_url"
                :href="connectionError.help_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {{ __('Learn more', 'flexify-dashboard') }}
                <AppIcon icon="open_in_new" class="text-xs" />
              </a>
              <button
                @click="testConnection"
                class="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {{ __('Retest Connection', 'flexify-dashboard') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Account Info -->
      <div
        v-if="status?.client_email"
        class="text-sm text-zinc-500 dark:text-zinc-400"
      >
        {{ __('Service Account:', 'flexify-dashboard') }}
        <span class="font-mono text-xs">{{ status.client_email }}</span>
      </div>

      <!-- Property Selector (when properties loaded successfully) -->
      <div v-if="properties.length > 0 && !showManualEntry" class="space-y-2">
        <label
          class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {{ __('Select Property', 'flexify-dashboard') }}
        </label>
        <div class="flex gap-2">
          <select
            v-model="selectedProperty"
            class="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            :disabled="loadingProperties"
          >
            <option value="">
              {{ __('Select a property...', 'flexify-dashboard') }}
            </option>
            <option v-for="prop in properties" :key="prop.id" :value="prop.id">
              {{ prop.name }} ({{ prop.account }})
            </option>
          </select>
        </div>
        <p
          v-if="selectedProperty"
          class="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {{ __('Property ID:', 'flexify-dashboard') }} {{ selectedProperty }}
        </p>
      </div>

      <!-- Manual Property Entry (when auto-fetch fails or user prefers manual) -->
      <div
        v-else-if="(showManualEntry || propertiesError) && isConnected && !selectedProperty"
        class="space-y-3"
      >
        <!-- Error message if any -->
        <div
          v-if="propertiesError"
          class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
        >
          <p class="text-sm text-amber-800 dark:text-amber-200">
            {{ propertiesError }}
          </p>
        </div>

        <!-- Manual entry form -->
        <div class="space-y-2">
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {{ __('Enter Property ID', 'flexify-dashboard') }}
          </label>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            {{
              __(
                'Find your Property ID in Google Analytics: Admin → Property Settings → Property ID (a number like 123456789)',
                'flexify-dashboard'
              )
            }}
          </p>
          <div class="flex gap-2">
            <input
              v-model="manualPropertyId"
              type="text"
              :placeholder="__('e.g. 123456789', 'flexify-dashboard')"
              class="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autocomplete="off"
            />
            <AppButton
              type="primary"
              @click="saveManualProperty"
              :loading="loading"
              :disabled="!manualPropertyId.trim()"
            >
              {{ __('Save', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Property already configured -->
      <div
        v-else-if="selectedProperty && isConnected"
        class="space-y-2"
      >
        <label
          class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {{ __('Property ID', 'flexify-dashboard') }}
        </label>
        <div class="flex items-center gap-2">
          <span class="text-sm font-mono text-zinc-600 dark:text-zinc-400">
            {{ selectedProperty }}
          </span>
          <AppButton
            type="transparent"
            size="small"
            @click="showManualEntry = true; selectedProperty = ''; manualPropertyId = '';"
          >
            {{ __('Change', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>

      <!-- Loading Properties -->
      <div
        v-if="loadingProperties"
        class="flex items-center gap-2 text-sm text-zinc-500"
      >
        <div
          class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
        ></div>
        {{ __('Loading properties...', 'flexify-dashboard') }}
      </div>

      <!-- Disconnect Button -->
      <div class="pt-2">
        <AppButton
          type="danger"
          @click="disconnect"
          :loading="disconnecting"
          size="small"
        >
          <AppIcon icon="link_off" class="mr-1" />
          {{ __('Disconnect', 'flexify-dashboard') }}
        </AppButton>
      </div>
    </div>

    <!-- Not Connected State -->
    <div v-else class="space-y-4">
      <!-- Setup Instructions Toggle -->
      <div>
        <button
          @click="showInstructions = !showInstructions"
          class="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          <AppIcon
            :icon="showInstructions ? 'expand_less' : 'expand_more'"
            class="text-base"
          />
          {{ __('Setup Instructions', 'flexify-dashboard') }}
        </button>
      </div>

      <!-- Instructions Panel -->
      <div
        v-if="showInstructions"
        class="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-3 text-sm"
      >
        <h4 class="font-medium text-zinc-900 dark:text-zinc-100">
          {{ __('How to connect Google Analytics 4', 'flexify-dashboard') }}
        </h4>

        <ol class="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
          <li>
            {{ __('Go to', 'flexify-dashboard') }}
            <a
              href="https://console.cloud.google.com/projectcreate"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {{ __('Google Cloud Console', 'flexify-dashboard') }}
            </a>
            {{ __('and create a new project (or select existing)', 'flexify-dashboard') }}
          </li>
          <li>
            {{ __('Enable the', 'flexify-dashboard') }}
            <a
              href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {{ __('Google Analytics Data API', 'flexify-dashboard') }}
            </a>
          </li>
          <li>
            {{ __('Go to', 'flexify-dashboard') }}
            <a
              href="https://console.cloud.google.com/iam-admin/serviceaccounts"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {{ __('Service Accounts', 'flexify-dashboard') }}
            </a>
            {{ __('and create a new service account', 'flexify-dashboard') }}
          </li>
          <li>
            {{
              __(
                'Click the service account, go to "Keys" tab, click "Add Key" → "Create new key" → JSON',
                'flexify-dashboard'
              )
            }}
          </li>
          <li>
            {{ __('Download the JSON key file', 'flexify-dashboard') }}
          </li>
          <li>
            {{ __('In', 'flexify-dashboard') }}
            <a
              href="https://analytics.google.com/analytics/web/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {{ __('Google Analytics', 'flexify-dashboard') }}
            </a>
            {{
              __(
                '→ Admin → Property Access Management, add the service account email as a Viewer',
                'flexify-dashboard'
              )
            }}
          </li>
          <li>
            {{
              __(
                'Paste the contents of the JSON key file below and enter your Property ID',
                'flexify-dashboard'
              )
            }}
          </li>
        </ol>

        <div
          class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <p class="text-xs text-blue-800 dark:text-blue-200">
            <strong>{{ __('Finding your Property ID:', 'flexify-dashboard') }}</strong>
            {{
              __(
                'In Google Analytics, go to Admin → Property Settings. Your Property ID is the number shown (e.g. 123456789).',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>

        <div
          class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
        >
          <p class="text-xs text-amber-800 dark:text-amber-200">
            <strong>{{ __('Important:', 'flexify-dashboard') }}</strong>
            {{
              __(
                'The service account email (found in the JSON file) must be added to your GA4 property with at least Viewer access for data to be retrieved.',
                'flexify-dashboard'
              )
            }}
          </p>
        </div>
      </div>

      <!-- Credentials Form -->
      <div v-if="showCredentialsForm" class="space-y-3">
        <div class="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-3">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            {{
              __(
                'Paste the contents of your service account JSON key file:',
                'flexify-dashboard'
              )
            }}
          </p>

          <textarea
            v-model="serviceAccountJson"
            :placeholder="__('Paste your service account JSON key here...', 'flexify-dashboard')"
            class="w-full h-40 px-3 py-2 text-sm font-mono border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            autocomplete="off"
            spellcheck="false"
          ></textarea>

          <div class="flex gap-2">
            <AppButton
              type="primary"
              @click="saveCredentials"
              :loading="saving"
              :disabled="!serviceAccountJson.trim()"
            >
              <AppIcon icon="check" class="mr-1" />
              {{ __('Connect', 'flexify-dashboard') }}
            </AppButton>
            <AppButton
              type="transparent"
              @click="
                showCredentialsForm = false;
                serviceAccountJson = '';
              "
            >
              {{ __('Cancel', 'flexify-dashboard') }}
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Connect Button -->
      <div v-else>
        <AppButton
          type="default"
          @click="
            showCredentialsForm = true;
            showInstructions = true;
          "
        >
          <AppIcon icon="link" class="mr-1" />
          {{ __('Connect Google Analytics', 'flexify-dashboard') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
