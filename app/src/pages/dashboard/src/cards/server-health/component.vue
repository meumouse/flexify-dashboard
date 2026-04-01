<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

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
const healthData = ref({});
const loading = ref(false);
const error = ref(null);

/**
 * Load server health data
 */
const loadHealthData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Fetch server health data from WordPress REST API
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/server-health',
      type: 'GET',
      params: {},
    });

    if (response && response.data) {
      healthData.value = response.data;
    } else {
      healthData.value = {};
    }
  } catch (err) {
    console.error('Error loading server health:', err);
    error.value = 'Failed to load server health data';
    healthData.value = {};
  } finally {
    loading.value = false;
  }
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get status color based on percentage
 */
const getStatusColor = (percentage, type = 'default') => {
  if (type === 'memory' || type === 'disk') {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-500/80';
  }

  if (type === 'load') {
    if (percentage >= 2.0) return 'text-red-600 dark:text-red-400';
    if (percentage >= 1.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-500/80';
  }

  return 'text-zinc-600 dark:text-zinc-400';
};

/**
 * Get status dot color
 */
const getStatusDotColor = (percentage, type = 'default') => {
  if (type === 'memory' || type === 'disk') {
    if (percentage >= 90) return 'bg-red-500 dark:bg-red-500/80';
    if (percentage >= 75) return 'bg-amber-500 dark:bg-amber-500/80';
    return 'bg-green-500 dark:bg-green-600/60';
  }

  if (type === 'load') {
    if (percentage >= 2.0) return 'bg-red-500 dark:bg-red-500/80';
    if (percentage >= 1.0) return 'bg-amber-500 dark:bg-amber-500/80';
    return 'bg-green-500 dark:bg-green-600/60';
  }

  return 'bg-zinc-500 dark:bg-zinc-600';
};

// Computed
const totalUpdates = computed(() => {
  const data = healthData.value;
  return (
    (data.plugins?.updates_available || 0) +
    (data.themes?.updates_available || 0) +
    (data.wordpress?.core_updates || 0)
  );
});

const memoryStatus = computed(() => {
  const data = healthData.value;
  return data.php?.memory_percentage || 0;
});

const diskStatus = computed(() => {
  const data = healthData.value;
  return data.server?.disk_space?.percentage || 0;
});

const serverLoad = computed(() => {
  const data = healthData.value;
  return data.server?.load?.average || 0;
});

// Watch for date range changes (though server health doesn't depend on date range)
watch(
  () => props.dateRange,
  () => {
    // Server health doesn't change based on date range, but we can reload if needed
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload health data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadHealthData();
});
</script>

<template>
  <div
    class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 flex flex-col h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __('Server Health', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('System performance and updates', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full"
          :class="getStatusDotColor(memoryStatus, 'memory')"
        ></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ totalUpdates }} {{ __('updates', 'flexify-dashboard') }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="animate-pulse">
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
    </div>

    <!-- Health Data -->
    <div
      v-else-if="healthData && Object.keys(healthData).length > 0"
      class="space-y-4"
    >
      <!-- System Versions -->
      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="flex items-center gap-2 mb-1">
            <AppIcon
              icon="code"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            />
            <span class="text-xs text-zinc-500 dark:text-zinc-400">{{
              __('WordPress', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {{ healthData.wordpress?.version || 'Unknown' }}
          </div>
        </div>

        <div class="p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="flex items-center gap-2 mb-1">
            <AppIcon
              icon="terminal"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            />
            <span class="text-xs text-zinc-500 dark:text-zinc-400">{{
              __('PHP', 'flexify-dashboard')
            }}</span>
          </div>
          <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {{ healthData.php?.version || 'Unknown' }}
          </div>
        </div>
      </div>

      <!-- Memory Usage -->
      <div class="p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <AppIcon
              icon="memory"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            />
            <span
              class="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >{{ __('Memory Usage', 'flexify-dashboard') }}</span
            >
          </div>
          <span
            class="text-sm font-medium"
            :class="getStatusColor(memoryStatus, 'memory')"
          >
            {{ memoryStatus }}%
          </span>
        </div>
        <div
          class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 relative"
        >
          <div
            class="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-brand-500 to-red-600"
            :style="`clip-path: inset(0% ${100 - memoryStatus}% 0% 0%);`"
          ></div>
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {{ healthData.php?.memory_usage || 0 }}MB /
          {{ healthData.php?.memory_limit || 0 }}MB
        </div>
      </div>

      <!-- Disk Space -->
      <div
        v-if="healthData.server?.disk_space"
        class="p-3 bg-white dark:bg-zinc-800/40 rounded-xl"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <AppIcon
              icon="storage"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            />
            <span
              class="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >{{ __('Disk Space', 'flexify-dashboard') }}</span
            >
          </div>
          <span
            class="text-sm font-medium"
            :class="getStatusColor(diskStatus, 'disk')"
          >
            {{ diskStatus }}%
          </span>
        </div>
        <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-brand-500 to-red-600"
            :style="`clip-path: inset(0% ${100 - diskStatus}% 0% 0%);`"
          ></div>
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {{ healthData.server.disk_space.used }}GB /
          {{ healthData.server.disk_space.total }}GB
        </div>
      </div>

      <!-- Updates Summary -->
      <div class="grid grid-cols-3 gap-3">
        <a
          :href="props.appData.adminUrl + 'plugins.php'"
          class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors duration-200 group"
        >
          <div
            class="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
          >
            {{ healthData.plugins?.updates_available || 0 }}
          </div>
          <div
            class="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
          >
            {{ __('Plugins', 'flexify-dashboard') }}
          </div>
        </a>
        <a
          :href="props.appData.adminUrl + 'themes.php'"
          class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors duration-200 group"
        >
          <div
            class="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
          >
            {{ healthData.themes?.updates_available || 0 }}
          </div>
          <div
            class="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
          >
            {{ __('Themes', 'flexify-dashboard') }}
          </div>
        </a>
        <a
          :href="props.appData.adminUrl + 'update-core.php'"
          class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors duration-200 group"
        >
          <div
            class="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
          >
            {{ healthData.wordpress?.core_updates || 0 }}
          </div>
          <div
            class="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
          >
            {{ __('Core', 'flexify-dashboard') }}
          </div>
        </a>
      </div>

      <!-- Additional Info -->
      <div
        class="grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <div class="flex items-center gap-2">
          <AppIcon icon="shield" class="text-sm" />
          <span
            >{{ __('SSL:', 'flexify-dashboard') }}
            {{ healthData.wordpress?.ssl_status || 'Unknown' }}</span
          >
        </div>
        <div class="flex items-center gap-2">
          <AppIcon icon="schedule" class="text-sm" />
          <span
            >{{ __('Timezone:', 'flexify-dashboard') }}
            {{ healthData.wordpress?.timezone || 'Unknown' }}</span
          >
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div
        class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-3"
      >
        <AppIcon icon="monitor" class="text-xl text-zinc-400" />
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No health data available', 'flexify-dashboard') }}
      </p>
    </div>
  </div>
</template>
