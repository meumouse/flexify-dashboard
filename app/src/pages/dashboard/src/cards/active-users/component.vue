<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { useAnalyticsQueue } from '@/composables/useAnalyticsQueue.js';

// Initialize analytics queue
const { analytics } = useAnalyticsQueue();

const props = defineProps({
  dateRange: {
    type: Array,
    required: true,
  },
  appData: {
    type: Object,
    required: true,
  },
});

// Refs
const activeUsers = ref(0);
const loading = ref(false);
const error = ref(null);
const providerError = ref(null);
const refreshInterval = ref(null);

/**
 * Load active users data using queue
 */
const loadActiveUsers = async () => {
  loading.value = true;
  error.value = null;
  providerError.value = null;

  try {
    // Get browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserTime = new Date().toISOString();

    // Use queue to get active users data with shorter cache for real-time data
    const data = await analytics.getActiveUsers(browserTimezone, browserTime, {
      cacheMaxAge: 10000, // 10 seconds cache for real-time data
    });

    // Check for provider-level errors (like permission denied)
    if (data?._error) {
      providerError.value = data._error;
    }

    activeUsers.value = data?.active_users || 0;
  } catch (err) {
    error.value = 'Failed to load active users data';
    activeUsers.value = 0;
  } finally {
    loading.value = false;
  }
};

/**
 * Format numbers with commas
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

/**
 * Get status indicator color based on active users count
 */
const getStatusColor = () => {
  if (activeUsers.value === 0) return 'bg-gray-400';
  if (activeUsers.value < 5) return 'bg-green-500';
  if (activeUsers.value < 20) return 'bg-green-500';
  return 'bg-brand-500';
};

/**
 * Get status text based on active users count
 */
const getStatusText = () => {
  if (activeUsers.value === 0) return 'No activity';
  if (activeUsers.value === 1) return '1 user online';
  return `${activeUsers.value} users online`;
};

// Auto-refresh every 60 seconds
const startAutoRefresh = () => {
  refreshInterval.value = setInterval(() => {
    loadActiveUsers();
  }, 60000); // 60 seconds
};

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

onMounted(() => {
  loadActiveUsers();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div
    class="bg-white border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 flex flex-col h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __('Active Users', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Users currently browsing', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full animate-pulse"
          :class="getStatusColor()"
        ></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ getStatusText() }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="animate-pulse">
        <div class="flex items-center justify-between p-3">
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
            <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
          </div>
          <div class="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <AppIcon icon="error" class="text-3xl text-zinc-400 mx-auto mb-3" />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ error }}</p>
      <button
        @click="loadActiveUsers"
        class="mt-2 text-brand-600 dark:text-brand-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>
    
    <!-- Provider Error State (e.g., permission denied) -->
    <div v-else-if="providerError" class="py-2">
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <div class="flex items-start gap-2">
          <AppIcon icon="warning" class="text-base text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {{ providerError.message }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Users Data -->
    <div v-else class="space-y-4">
      <!-- Active Users Count -->
      <div
        class="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 -mx-3 px-4"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Currently Active', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ __('Last 5 minutes', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
        <span class="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {{ formatNumber(activeUsers) }}
        </span>
      </div>
    </div>
  </div>
</template>
