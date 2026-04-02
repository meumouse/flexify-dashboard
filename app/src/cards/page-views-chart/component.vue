<script setup>
import { ref, computed, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import AppIcon from '@/components/utility/icons/index.vue';
import { useAnalyticsQueue } from '@/composables/useAnalyticsQueue.js';

// Initialize analytics queue
const { analytics: analyticsQueue } = useAnalyticsQueue();

const props = defineProps({
  dateRange: {
    type: Object,
    required: true,
  },
  appData: {
    type: Object,
    required: true,
  },
});

// Refs
const analytics = ref(null);
const loading = ref(false);
const error = ref(null);
const providerError = ref(null);

/**
 * Load page views analytics data using queue
 */
const loadAnalytics = async () => {
  loading.value = true;
  error.value = null;
  providerError.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Fetch chart data and overview stats using queue
    const [chartDataResult, overviewData] = await Promise.all([
      analyticsQueue.getChart(startDate, endDate, 'both', {
        cacheMaxAge: 30000, // 30 seconds cache
      }),
      analyticsQueue.getOverview(startDate, endDate, null, {
        cacheMaxAge: 30000, // 30 seconds cache
      }),
    ]);

    // Check for provider-level errors (like permission denied)
    const apiError = chartDataResult?._error || overviewData?._error;

    if (apiError) {
      providerError.value = apiError;
    }

    if (chartDataResult && overviewData) {
      analytics.value = {
        ...overviewData,
        chart_data: chartDataResult,
      };
    } else {
      analytics.value = null;
    }

    // Force chart re-render by updating the key
    chartKey.value++;
  } catch (err) {
    error.value = err.message || 'Failed to load analytics data';
  } finally {
    loading.value = false;
  }
};

/**
 * Format date label for chart using browser locale
 */
const formatDateLabel = (date) => {
  // Handle both Date objects and date strings from API
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Get browser locale
  const locale = navigator.language || 'en-US';

  // Format based on locale - use shorter format for chart labels
  try {
    // For US locale, use M/D format
    if (locale.startsWith('en-US')) {
      return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    }

    // For other locales, use locale-specific short date format
    return dateObj.toLocaleDateString(locale, {
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
  }
};

// Process chart data from API to format labels properly
const chartData = computed(() => {
  const rawChartData = analytics.value?.chart_data?.data;

  if (!rawChartData || !Array.isArray(rawChartData.labels)) {
    return null;
  }

  return {
    ...rawChartData,
    labels: rawChartData.labels.map((label) => formatDateLabel(label)),
  };
});

const chartSeries = computed(() => {
  if (!chartData.value?.datasets) return [];

  return chartData.value.datasets.map((dataset) => ({
    name: dataset.label,
    data: dataset.data || [],
  }));
});

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { speed: 300 },
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  markers: {
    size: 3,
    hover: {
      size: 5,
    },
  },
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: {
    categories: chartData.value?.labels || [],
    labels: {
      style: {
        colors: 'rgb(113, 113, 122)',
        fontSize: '11px',
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: (value) =>
        Number.isInteger(value) ? value.toLocaleString() : '',
      style: {
        colors: 'rgb(113, 113, 122)',
        fontSize: '11px',
      },
    },
  },
  grid: {
    borderColor: 'rgba(113, 113, 122, 0.1)',
    xaxis: { lines: { show: false } },
  },
  colors: chartData.value?.datasets?.map((dataset) => dataset.borderColor) || [
    'rgb(99, 102, 241)',
    'rgb(16, 185, 129)',
  ],
  tooltip: {
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    y: {
      formatter: (value) => value.toLocaleString(),
    },
  },
}));

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    if (!props.dateRange) return;
    loadAnalytics();
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div
    class="bg-zinc-50 dark:bg-[#24303f] rounded-3xl p-6 h-full flex flex-col border border-zinc-200/40 dark:border-zinc-800/60 pb-3"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading analytics...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-2">
          {{ __('Failed to load analytics', 'flexify-dashboard') }}
        </p>
        <button
          @click="loadAnalytics"
          class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          {{ __('Try again', 'flexify-dashboard') }}
        </button>
      </div>
    </div>
    
    <!-- Provider Error State (e.g., permission denied) -->
    <div v-else-if="providerError" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 max-w-md">
        <div class="flex items-start gap-3">
          <AppIcon icon="warning" class="text-2xl text-amber-500 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              {{ __('Google Analytics Connection Issue', 'flexify-dashboard') }}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mb-3">
              {{ providerError.message }}
            </p>
            <div class="flex items-center gap-3">
              <a
                v-if="providerError.help_url"
                :href="providerError.help_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {{ __('Learn more', 'flexify-dashboard') }}
                <AppIcon icon="open_in_new" class="text-xs" />
              </a>
              <button
                @click="loadAnalytics"
                class="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {{ __('Retry', 'flexify-dashboard') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Data -->
    <div v-else-if="analytics" class="h-full grow flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Page Views Analytics', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __('Website traffic trends', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div
        v-if="chartData"
        class="bg-white dark:bg-[#24303f] rounded-3xl p-4 -mx-3 grow"
      >
        <div class="h-full">
          <VueApexCharts
            height="100%"
            type="line"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="analytics" class="text-4xl text-zinc-400 mx-auto mb-3" />
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('No analytics data available', 'flexify-dashboard') }}
        </p>
      </div>
    </div>
  </div>
</template>
