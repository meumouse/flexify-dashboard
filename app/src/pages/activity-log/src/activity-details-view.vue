<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const loading = ref(false);
const logItem = ref(null);

/**
 * Fetches activity log item data by ID from WordPress REST API
 */
const getLogItem = async () => {
  if (!route.params.logId) return;

  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: `flexify-dashboard/v1/activity-log/${route.params.logId}`,
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data?.data) {
    notify({
      title: __('Activity log entry not found', 'flexify-dashboard'),
      type: 'error',
    });
    router.push('/');
    return;
  }

  logItem.value = data.data;
};

/**
 * Parse date string, handling UTC dates without timezone info
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If date string doesn't have timezone info and looks like MySQL datetime, treat as UTC
  if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    // MySQL datetime format without timezone - treat as UTC
    return new Date(dateString + 'Z');
  }
  
  // If it's already ISO 8601 with timezone indicator (Z or offset like +00:00, -05:00), use as-is
  if (dateString.includes('T') && (dateString.endsWith('Z') || dateString.match(/[+-]\d{2}:\d{2}$/))) {
    return new Date(dateString);
  }
  
  // If it's ISO 8601 format without timezone (e.g., "2024-01-01T12:00:00"), treat as UTC
  if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateString + 'Z');
  }
  
  // Try parsing as-is
  const parsed = new Date(dateString);
  
  // If invalid, try adding UTC indicator
  if (isNaN(parsed.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateString + 'Z');
  }
  
  return parsed;
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '—';
  
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Format relative time
 */
const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '—';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return __('Just now', 'flexify-dashboard');
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? __('1 minute ago', 'flexify-dashboard')
      : __('%d minutes ago', 'flexify-dashboard').replace('%d', diffInMinutes);
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1
      ? __('1 hour ago', 'flexify-dashboard')
      : __('%d hours ago', 'flexify-dashboard').replace('%d', diffInHours);
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1
      ? __('1 day ago', 'flexify-dashboard')
      : __('%d days ago', 'flexify-dashboard').replace('%d', diffInDays);
  }

  return formatDate(dateString);
};

/**
 * Get action icon
 */
const getActionIcon = (action) => {
  const icons = {
    created: 'add',
    updated: 'edit',
    deleted: 'delete',
    trashed: 'delete',
    restored: 'restore',
    activated: 'check_circle',
    deactivated: 'cancel',
    installed: 'download',
    login: 'login',
    logout: 'logout',
    role_changed: 'admin_users',
    status_changed: 'flag',
    uploaded: 'upload',
  };
  return icons[action] || 'info';
};

/**
 * Get action color
 */
const getActionColor = (action) => {
  const colors = {
    created: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    updated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    trashed: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    restored: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    activated: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    deactivated: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    installed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    login: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    logout: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
    role_changed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    status_changed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    uploaded: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };
  return colors[action] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';
};

/**
 * Format JSON for display
 */
const formatJson = (obj) => {
  if (!obj) return '—';
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch (e) {
      return obj;
    }
  }
  return JSON.stringify(obj, null, 2);
};

/**
 * Check if value is different
 */
const hasChanges = computed(() => {
  if (!logItem.value) return false;
  return (
    logItem.value.old_value &&
    logItem.value.new_value &&
    JSON.stringify(logItem.value.old_value) !==
      JSON.stringify(logItem.value.new_value)
  );
});

// Watch for route changes
watch(
  () => route.params.logId,
  () => {
    getLogItem();
  },
  { immediate: true }
);

onMounted(() => {
  getLogItem();
});
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div v-if="loading" class="p-8 text-center">
      <p class="text-zinc-600 dark:text-zinc-400">{{ __('Loading...', 'flexify-dashboard') }}</p>
    </div>

    <div v-else-if="logItem" class="p-6 lg:p-8">
      <!-- Header -->
      <div class="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {{ __('Activity Details', 'flexify-dashboard') }}
          </h2>
        </div>

        <!-- Action Badge -->
        <div class="flex items-center gap-3">
          <span
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg uppercase flex items-center gap-2',
              getActionColor(logItem.action),
            ]"
          >
            <AppIcon :icon="getActionIcon(logItem.action)" class="text-base" />
            {{ logItem.action }}
          </span>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">
            {{ logItem.object_type }}
            <span v-if="logItem.object_id"> #{{ logItem.object_id }}</span>
          </span>
        </div>
      </div>

      <!-- User Information -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
          {{ __('User Information', 'flexify-dashboard') }}
        </h3>
        <div class="flex items-center gap-4">
          <div
            class="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"
          >
            <img
              v-if="logItem.user?.avatar"
              :src="logItem.user.avatar"
              :alt="logItem.user.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <AppIcon icon="person" class="text-zinc-500 dark:text-zinc-400 text-2xl" />
            </div>
          </div>
          <div>
            <p class="font-medium text-zinc-900 dark:text-zinc-100">
              {{ logItem.user?.name || __('Unknown', 'flexify-dashboard') }}
            </p>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ logItem.user?.email || '—' }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              User ID: {{ logItem.user_id }}
            </p>
          </div>
        </div>
      </div>

      <!-- Activity Details -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
          {{ __('Activity Details', 'flexify-dashboard') }}
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              {{ __('Timestamp', 'flexify-dashboard') }}
            </label>
            <p class="text-sm text-zinc-900 dark:text-zinc-100">
              {{ formatDate(logItem.created_at) }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              {{ formatRelativeTime(logItem.created_at) }}
            </p>
          </div>

          <div v-if="logItem.ip_address">
            <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              {{ __('IP Address', 'flexify-dashboard') }}
            </label>
            <p class="text-sm text-zinc-900 dark:text-zinc-100 font-mono">
              {{ logItem.ip_address }}
            </p>
          </div>

          <div v-if="logItem.user_agent">
            <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              {{ __('User Agent', 'flexify-dashboard') }}
            </label>
            <p class="text-sm text-zinc-900 dark:text-zinc-100 font-mono break-all">
              {{ logItem.user_agent }}
            </p>
          </div>
        </div>
      </div>

      <!-- Before/After Comparison -->
      <div
        v-if="hasChanges"
        class="mb-6"
      >
        <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
          {{ __('Changes', 'flexify-dashboard') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              {{ __('Before', 'flexify-dashboard') }}
            </label>
            <pre
              class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-xs font-mono text-zinc-900 dark:text-zinc-100 overflow-auto max-h-96"
            >{{ formatJson(logItem.old_value) }}</pre>
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              {{ __('After', 'flexify-dashboard') }}
            </label>
            <pre
              class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-xs font-mono text-zinc-900 dark:text-zinc-100 overflow-auto max-h-96"
            >{{ formatJson(logItem.new_value) }}</pre>
          </div>
        </div>
      </div>

      <!-- New Value Only (if no old value) -->
      <div
        v-else-if="logItem.new_value"
        class="mb-6"
      >
        <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
          {{ __('Details', 'flexify-dashboard') }}
        </h3>
        <pre
          class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-xs font-mono text-zinc-900 dark:text-zinc-100 overflow-auto max-h-96"
        >{{ formatJson(logItem.new_value) }}</pre>
      </div>

      <!-- Metadata -->
      <div
        v-if="logItem.metadata"
        class="mb-6"
      >
        <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
          {{ __('Metadata', 'flexify-dashboard') }}
        </h3>
        <pre
          class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-xs font-mono text-zinc-900 dark:text-zinc-100 overflow-auto max-h-96"
        >{{ formatJson(logItem.metadata) }}</pre>
      </div>
    </div>
  </div>
</template>

