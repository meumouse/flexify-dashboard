<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
const deviceData = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load device usage data based on date range using queue
 */
const loadDeviceData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get device stats
    const data = await analytics.getDevices(startDate, endDate, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Ensure deviceData is always an array (API might return object with metadata)
    // Handle Google Analytics format: object with numeric keys and _provider field
    if (Array.isArray(data)) {
      deviceData.value = data;
    } else if (data && Array.isArray(data.data)) {
      deviceData.value = data.data;
    } else if (data && Array.isArray(data.rows)) {
      deviceData.value = data.rows;
    } else if (data && typeof data === 'object' && data._provider) {
      // Google Analytics format: object with numeric string keys
      // Convert to array by filtering out metadata fields
      deviceData.value = Object.keys(data)
        .filter((key) => key !== '_provider' && key !== '_error')
        .map((key) => data[key])
        .filter((item) => item && typeof item === 'object');
    } else {
      deviceData.value = [];
    }
  } catch (err) {
    console.error('Error loading device data:', err);
    error.value = 'Failed to load device usage data';
    deviceData.value = [];
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
 * Get device icon
 */
const getDeviceIcon = (deviceType) => {
  const icons = {
    desktop: 'computer',
    mobile: 'mobile',
    tablet: 'tablet',
  };
  return icons[deviceType] || 'devices';
};

/**
 * Get device color
 */
const getDeviceColor = (deviceType) => {
  const colors = {
    desktop:
      'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
    mobile:
      'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
    tablet:
      'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
  };
  return (
    colors[deviceType] ||
    'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
  );
};

/**
 * Get device label
 */
const getDeviceLabel = (deviceType) => {
  const labels = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet',
  };
  return labels[deviceType] || deviceType;
};

/**
 * Computed properties for device data
 */
const deviceStats = computed(() => {
  if (!deviceData.value || !Array.isArray(deviceData.value)) {
    return [];
  }

  // Group by device type and sum up the stats
  const grouped = deviceData.value.reduce((acc, item) => {
    const deviceType = item.device_type || 'unknown';
    if (!acc[deviceType]) {
      acc[deviceType] = {
        device_type: deviceType,
        views: 0,
        unique_visitors: 0,
      };
    }
    // Use the correct field names from the API response
    acc[deviceType].views += parseInt(item.total_views || item.views || 0);
    acc[deviceType].unique_visitors += parseInt(
      item.total_unique_visitors || item.unique_visitors || 0
    );
    return acc;
  }, {});

  // Convert to array and sort by views
  return Object.values(grouped).sort((a, b) => b.views - a.views);
});

const totalViews = computed(() => {
  return deviceStats.value.reduce((sum, device) => sum + device.views, 0);
});

const totalUniqueVisitors = computed(() => {
  return deviceStats.value.reduce(
    (sum, device) => sum + device.unique_visitors,
    0
  );
});

/**
 * Calculate percentage for device
 */
const getDevicePercentage = (deviceViews) => {
  if (totalViews.value === 0) return 0;
  return Math.round((deviceViews / totalViews.value) * 100);
};

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadDeviceData();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload device data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadDeviceData();
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
          {{ __('Device Usage', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Device type distribution', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ formatNumber(totalViews) }} {{ __('views', 'flexify-dashboard') }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-xl"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20"></div>
              <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-16"></div>
            </div>
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
        @click="loadDeviceData"
        class="mt-2 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Device Data -->
    <div v-else-if="deviceStats && deviceStats.length > 0" class="space-y-3">
      <!-- Device Statistics -->
      <div
        v-for="device in deviceStats"
        :key="device.device_type"
        class="relative"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {{ getDeviceLabel(device.device_type) }}
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                {{ formatNumber(device.unique_visitors) }}
                {{ __('unique visitors', 'flexify-dashboard') }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {{ formatNumber(device.views) }}
            </span>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ getDevicePercentage(device.views) }}%
            </p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div
          class="mt-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5"
        >
          <div
            class="h-1.5 rounded-full transition-all duration-300 bg-indigo-500 dark:bg-indigo-500/60"
            :style="{ width: getDevicePercentage(device.views) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-8">
      <AppIcon
        icon="devices"
        class="text-3xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
      />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No device data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{
          __(
            'Device data will appear when visitors browse your site',
            'flexify-dashboard'
          )
        }}
      </p>
    </div>
  </div>
</template>
