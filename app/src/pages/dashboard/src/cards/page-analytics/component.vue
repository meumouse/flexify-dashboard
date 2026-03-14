<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { useAnalyticsQueue } from '@/composables/useAnalyticsQueue.js';

// Initialize analytics queue
const { analytics: analyticsQueue } = useAnalyticsQueue();

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
const analytics = ref({});
const loading = ref(false);
const error = ref(null);
const providerError = ref(null);

/**
 * Load analytics data based on date range using queue
 */
const loadAnalytics = async () => {
  loading.value = true;
  error.value = null;
  providerError.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get overview stats
    const data = await analyticsQueue.getOverview(startDate, endDate, null, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Check for provider-level errors (like permission denied)
    if (data?._error) {
      providerError.value = data._error;
    }

    analytics.value = data || {};
  } catch (err) {
    error.value = 'Failed to load analytics data';
    analytics.value = {};
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
 * Calculate percentage change between current and previous period
 */
const calculatePercentageChange = (current, previous) => {
  if (!current || !previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * Get comparison indicator data for a metric
 */
const getComparisonData = (current, previous) => {
  const change = calculatePercentageChange(current, previous);
  const isPositive = change >= 0;

  return {
    percentage: Math.abs(change),
    isPositive,
    color: isPositive ? 'text-green-500' : 'text-red-500',
    icon: isPositive ? 'arrow_up' : 'arrow_down',
    showComparison: previous > 0, // Only show if we have comparison data
  };
};

/**
 * Computed properties for display
 */
const totalViews = computed(() => analytics.value?.total_views || 0);
const uniqueVisitors = computed(
  () => analytics.value?.total_unique_visitors || 0
);

// Comparison data computed properties
const totalViewsComparison = computed(() => {
  const current = analytics.value?.total_views || 0;
  const previous = analytics.value?.comparison?.total_views || 0;
  return getComparisonData(current, previous);
});

const uniqueVisitorsComparison = computed(() => {
  const current = analytics.value?.total_unique_visitors || 0;
  const previous = analytics.value?.comparison?.total_unique_visitors || 0;
  return getComparisonData(current, previous);
});

// Popover state
const showPopover = ref(false);
const popoverContent = ref('');
const popoverPosition = ref({ x: 0, y: 0 });

/**
 * Show popover with previous period data
 */
const showComparisonPopover = (event, current, previous, label) => {
  popoverContent.value = `${label}: ${formatNumber(previous)}`;
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

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadAnalytics();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload analytics based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadAnalytics();
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
          {{ __('Page Analytics', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Website traffic and engagement', 'flexify-dashboard') }}
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
    </div>
    
    <!-- Provider Error State (e.g., permission denied) -->
    <div v-else-if="providerError" class="py-4">
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <AppIcon icon="warning" class="text-xl text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              {{ __('Google Analytics Error', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {{ providerError.message }}
            </p>
            <a
              v-if="providerError.help_url"
              :href="providerError.help_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 mt-2"
            >
              {{ __('Learn more', 'flexify-dashboard') }}
              <AppIcon icon="open_in_new" class="text-xs" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Data -->
    <div
      v-else-if="analytics && Object.keys(analytics).length > 0"
      class="space-y-4"
    >
      <!-- Page Views -->
      <div
        class="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 -mx-3 px-4"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Page Views', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ __('Total page visits', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
        <span
          class="text-xl text-zinc-900 dark:text-zinc-100 flex flex-row items-end gap-2"
        >
          <!-- Comparison indicator -->
          <div
            v-if="totalViewsComparison.showComparison"
            class="flex items-center text-xs cursor-help"
            @mouseenter="
              showComparisonPopover(
                $event,
                analytics.total_views,
                analytics.comparison.total_views,
                'Previous Period'
              )
            "
            @mouseleave="hideComparisonPopover"
          >
            <AppIcon
              :icon="totalViewsComparison.icon"
              :class="totalViewsComparison.color"
            />
            <span :class="totalViewsComparison.color">
              {{ totalViewsComparison.percentage }}%
            </span>
          </div>
          <div class="leading-none font-bold">
            {{ formatNumber(totalViews) }}
          </div>
        </span>
      </div>

      <!-- Unique Visitors -->
      <div
        class="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 -mx-3 px-4"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {{ __('Unique Visitors', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ __('Individual visitors', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
        <span
          class="text-xl text-zinc-900 dark:text-zinc-100 flex flex-row items-end gap-2"
        >
          <!-- Comparison indicator -->
          <div
            v-if="uniqueVisitorsComparison.showComparison"
            class="flex items-center text-xs cursor-help"
            @mouseenter="
              showComparisonPopover(
                $event,
                analytics.total_unique_visitors,
                analytics.comparison.total_unique_visitors,
                'Previous Period'
              )
            "
            @mouseleave="hideComparisonPopover"
          >
            <AppIcon
              :icon="uniqueVisitorsComparison.icon"
              :class="uniqueVisitorsComparison.color"
            />
            <span :class="uniqueVisitorsComparison.color">
              {{ uniqueVisitorsComparison.percentage }}%
            </span>
          </div>
          <div class="leading-none font-bold">
            {{ formatNumber(uniqueVisitors) }}
          </div>
        </span>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-8">
      <AppIcon
        icon="analytics"
        class="text-3xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
      />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No analytics data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{ __('Enable analytics in settings to view data', 'flexify-dashboard') }}
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
