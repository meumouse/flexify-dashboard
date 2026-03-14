<script setup>
import { ref } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  confirm: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['update:settings']);

const newSiteUrl = ref('');
const newUsername = ref('');
const newAppPassword = ref('');

/**
 * Validates a URL format
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidUrl = (url) => {
  if (!url || url.trim() === '') return false;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Normalizes a URL to include protocol if missing
 *
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL with protocol
 */
const normalizeUrl = (url) => {
  if (!url || url.trim() === '') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Adds a new remote site to the settings
 */
const addRemoteSite = () => {
  if (
    !newSiteUrl.value.trim() ||
    !newUsername.value.trim() ||
    !newAppPassword.value.trim()
  ) {
    notify({
      title: __('Invalid Input', 'flexify-dashboard'),
      message: __(
        'Site URL, username, and application password are required',
        'flexify-dashboard'
      ),
      type: 'error',
    });
    return;
  }

  const normalizedUrl = normalizeUrl(newSiteUrl.value);

  if (!isValidUrl(normalizedUrl)) {
    notify({
      title: __('Invalid URL', 'flexify-dashboard'),
      message: __('Please provide a valid site URL', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  const remoteSites = props.settings.remote_sites || [];

  const exists = remoteSites.some(
    (site) => site.url.toLowerCase() === normalizedUrl.toLowerCase()
  );

  if (exists) {
    notify({
      title: __('Duplicate Site', 'flexify-dashboard'),
      message: __('This site URL already exists', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  const updatedSites = [
    ...remoteSites,
    {
      url: normalizedUrl,
      username: newUsername.value.trim(),
      app_password: newAppPassword.value.trim(),
    },
  ];

  emit('update:settings', {
    ...props.settings,
    remote_sites: updatedSites,
  });

  newSiteUrl.value = '';
  newUsername.value = '';
  newAppPassword.value = '';
};

/**
 * Removes a remote site from the settings
 *
 * @param {number} index - The index of the site to remove
 */
const removeRemoteSite = async (index) => {
  const confirmFn = props.confirm;
  if (confirmFn) {
    const userResponse = await confirmFn({
      title: __('Remove Remote Site?', 'flexify-dashboard'),
      message: __(
        'Are you sure you want to remove this remote site? This action cannot be undone.',
        'flexify-dashboard'
      ),
      okButton: __('Yes, remove site', 'flexify-dashboard'),
    });

    if (!userResponse) return;
  }

  const updatedSites = [...(props.settings.remote_sites || [])];
  updatedSites.splice(index, 1);

  emit('update:settings', {
    ...props.settings,
    remote_sites: updatedSites,
  });

  notify({
    title: __('Site Removed', 'flexify-dashboard'),
    message: __('Remote site has been removed successfully', 'flexify-dashboard'),
    type: 'success',
  });
};
</script>

<template>
  <div class="flex flex-col">
      <!-- Add new site form -->
      <div class="flex flex-col gap-3 mb-4">
        <AppInput
          v-model="newSiteUrl"
          class="w-full"
          icon="link"
          :placeholder="__('Site URL (e.g., https://example.com)', 'flexify-dashboard')"
          autocomplete="url"
          data-form-type="other" />
        <div class="flex flex-row gap-3">
          <AppInput
            v-model="newUsername"
            class="grow"
            icon="user"
            :placeholder="__('Username', 'flexify-dashboard')"
            autocomplete="username"
            data-form-type="other" />
          <AppInput
            v-model="newAppPassword"
            class="grow"
            icon="lock"
            type="password"
            :placeholder="__('Application Password', 'flexify-dashboard')"
            autocomplete="new-password"
            data-form-type="other" />
          <AppButton
            type="default"
            @click="addRemoteSite"
            :disabled="!newSiteUrl || !newUsername || !newAppPassword"
            >{{ __('Add Site', 'flexify-dashboard') }}</AppButton
          >
        </div>
      </div>

      <!-- List of existing sites -->
      <div
        class="max-h-80 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <table
          class="w-full"
          v-if="settings.remote_sites && settings.remote_sites.length > 0">
          <thead class="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              <th class="text-left p-3">
                {{ __('Site URL', 'flexify-dashboard') }}
              </th>
              <th class="text-left p-3">{{ __('Username', 'flexify-dashboard') }}</th>
              <th class="text-left p-3">{{ __('Password', 'flexify-dashboard') }}</th>
              <th class="text-right p-3 w-24">
                {{ __('Action', 'flexify-dashboard') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(site, index) in settings.remote_sites"
              :key="index"
              class="border-t border-zinc-200 dark:border-zinc-700">
              <td class="p-3 text-sm">{{ site.url }}</td>
              <td class="p-3 text-sm">{{ site.username }}</td>
              <td class="p-3 text-sm font-mono">
                {{ site.app_password ? '••••••••' : '' }}
              </td>
              <td class="p-3 text-right">
                <button
                  @click="removeRemoteSite(index)"
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                  <AppIcon icon="trash" class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="p-6 text-center text-zinc-500 dark:text-zinc-400">
          {{ __('No remote sites configured yet', 'flexify-dashboard') }}
        </div>
      </div>
      <div class="text-sm mt-2 text-zinc-500 dark:text-zinc-400">
        {{
          __(
            'Application passwords can be created in WordPress under Users > Profile > Application Passwords',
            'flexify-dashboard'
          )
        }}
      </div>
  </div>
</template>

