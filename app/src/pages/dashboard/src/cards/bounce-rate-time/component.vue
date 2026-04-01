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
const engagementData = ref({});
const loading = ref(false);
const error = ref(null);

/**
 * Load engagement data based on date range using queue
 */
const loadEngagementData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get overview stats
    const data = await analytics.getOverview(startDate, endDate, null, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    engagementData.value = data || {};
  } catch (err) {
    console.error('Error loading engagement data:', err);
    error.value = 'Failed to load engagement data';
    engagementData.value = {};
  } finally {
    loading.value = false;
  }
};

/**
 * Format numbers with appropriate suffixes
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

/**
 * Format percentage with 1 decimal place
 */
const formatPercentage = (num) => {
  if (num === null || num === undefined) return '0.0%';
  return `${parseFloat(num).toFixed(1)}%`;
};

/**
 * Format time duration in a readable format
 */
const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Calculate percentage change between current and previous period
 */
const calculatePercentageChange = (current, previous) => {
  if (!current || !previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * Get comparison indicator data for a metric with custom logic for engagement metrics
 */
const getComparisonData = (current, previous, metricType = 'normal') => {
  const change = calculatePercentageChange(current, previous);
  let isPositive = change >= 0;

  // Special logic for engagement metrics
  if (metricType === 'bounce_rate') {
    // For bounce rate, increase is negative (bad), decrease is positive (good)
    isPositive = change <= 0;
  } else if (metricType === 'time') {
    // For time metrics, increase is positive (good), decrease is negative (bad)
    isPositive = change >= 0;
  }

  return {
    percentage: Math.abs(change),
    isPositive,
    color: isPositive ? 'text-green-500' : 'text-red-500',
    icon: isPositive ? 'arrow_up' : 'arrow_down',
    showComparison: previous > 0, // Only show if we have comparison data
  };
};

// Computed properties
const bounceRate = computed(() => {
  return engagementData.value?.avg_bounce_rate || 0;
});

const avgTimeOnSite = computed(() => {
  return engagementData.value?.avg_time_on_page || 0;
});

const totalSessions = computed(() => {
  return engagementData.value?.total_sessions || 0;
});

// Comparison data computed properties
const bounceRateComparison = computed(() => {
  const current = engagementData.value?.avg_bounce_rate || 0;
  const previous = engagementData.value?.comparison?.avg_bounce_rate || 0;
  return getComparisonData(current, previous, 'bounce_rate');
});

const avgTimeComparison = computed(() => {
  const current = engagementData.value?.avg_time_on_page || 0;
  const previous = engagementData.value?.comparison?.avg_time_on_page || 0;
  return getComparisonData(current, previous, 'time');
});

// Popover state
const showPopover = ref(false);
const popoverContent = ref('');
const popoverPosition = ref({ x: 0, y: 0 });

/**
 * Show popover with previous period data
 */
const showComparisonPopover = (
  event,
  current,
  previous,
  label,
  formatter = formatNumber
) => {
  popoverContent.value = `${label}: ${formatter(previous)}`;
  popoverPosition.value = {
    x: event.target.getBoundingClientRect().left,
    y: event.target.getBoundingClientRect().top - 40,
  };
  showPopover.value = true;
};

/**
 * Hide popover
 */
const hideComparisonPopover = () => {
  showPopover.value = false;
};

const avgPagesPerSession = computed(() => {
  return engagementData.value?.avg_pages_per_session || 0;
});

/**
 * Get bounce rate color based on value
 */
const getBounceRateColor = () => {
  const rate = bounceRate.value;
  if (rate < 40) return 'text-green-600 dark:text-green-400';
  if (rate < 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Get bounce rate status text
 */
const getBounceRateStatus = () => {
  const rate = bounceRate.value;
  if (rate < 40) return 'Excellent';
  if (rate < 60) return 'Good';
  return 'Needs Improvement';
};

/**
 * Get time on site color based on value
 */
const getTimeOnSiteColor = () => {
  const time = avgTimeOnSite.value;
  if (time > 180) return 'text-green-600 dark:text-green-400'; // > 3 minutes
  if (time > 60) return 'text-yellow-600 dark:text-yellow-400'; // > 1 minute
  return 'text-red-600 dark:text-red-400';
};

/**
 * Get time on site status text
 */
const getTimeOnSiteStatus = () => {
  const time = avgTimeOnSite.value;
  if (time > 180) return 'Great';
  if (time > 60) return 'Good';
  return 'Short';
};

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadEngagementData();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload engagement data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadEngagementData();
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
          {{ __('Engagement', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('User behavior metrics', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="animate-pulse">
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
        @click="loadEngagementData"
        class="mt-2 text-brand-600 dark:text-brand-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Engagement Data -->
    <div
      v-else-if="engagementData && Object.keys(engagementData).length > 0"
      class="space-y-4"
    >
      <!-- Bounce Rate -->
      <div
        class="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 -mx-3 px-4"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Bounce Rate', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ getBounceRateStatus() }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <span
            class="text-xl text-zinc-900 dark:text-white flex flex-row items-end justify-end gap-2"
          >
            <!-- Comparison indicator -->
            <div
              v-if="bounceRateComparison.showComparison"
              class="flex items-center text-xs cursor-help"
              @mouseenter="
                showComparisonPopover(
                  $event,
                  engagementData.avg_bounce_rate,
                  engagementData.comparison.avg_bounce_rate,
                  'Previous Period',
                  formatPercentage
                )
              "
              @mouseleave="hideComparisonPopover"
            >
              <AppIcon
                :icon="bounceRateComparison.icon"
                :class="bounceRateComparison.color"
              />
              <span :class="bounceRateComparison.color">
                {{ bounceRateComparison.percentage }}%
              </span>
            </div>
            <span class="leading-none font-bold">
              {{ formatPercentage(bounceRate) }}
            </span>
          </span>
        </div>
      </div>

      <!-- Average Time on Site -->
      <div
        class="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 -mx-3 px-4"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Avg. Time on Site', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ getTimeOnSiteStatus() }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <span
            class="text-xl text-zinc-900 dark:text-white flex flex-row items-end justify-end gap-2"
          >
            <!-- Comparison indicator -->
            <div
              v-if="avgTimeComparison.showComparison"
              class="flex items-center text-xs cursor-help"
              @mouseenter="
                showComparisonPopover(
                  $event,
                  engagementData.avg_time_on_page,
                  engagementData.comparison.avg_time_on_page,
                  'Previous Period',
                  formatDuration
                )
              "
              @mouseleave="hideComparisonPopover"
            >
              <AppIcon
                :icon="avgTimeComparison.icon"
                :class="avgTimeComparison.color"
              />
              <span :class="avgTimeComparison.color">
                {{ avgTimeComparison.percentage }}%
              </span>
            </div>
            <span class="leading-none font-bold">
              {{ formatDuration(avgTimeOnSite) }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-8">
      <AppIcon
        icon="analytics"
        class="text-3xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
      />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No engagement data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{
          __(
            'Engagement data will appear when users interact with your site',
            'flexify-dashboard'
          )
        }}
      </p>
    </div>

    <!-- Comparison Popover -->
    <div
      v-if="showPopover"
      class="fixed z-50 px-2 py-1 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md shadow-lg pointer-events-none"
      :style="{
        left: popoverPosition.x + 'px',
        top: popoverPosition.y + 'px',
        transform: 'translateX(-50%)',
      }"
    >
      {{ popoverContent }}
      <!-- Arrow -->
      <div
        class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"
      ></div>
    </div>
  </div>
</template>
