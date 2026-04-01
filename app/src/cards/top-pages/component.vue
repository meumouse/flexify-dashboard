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
const pagesData = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load top pages data based on date range using queue
 */
const loadPagesData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get pages stats
    const data = await analytics.getPages(startDate, endDate, null, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Ensure pagesData is always an array (API might return object with metadata)
    // Handle Google Analytics format: object with numeric keys and _provider field
    if (Array.isArray(data)) {
      pagesData.value = data;
    } else if (data && Array.isArray(data.data)) {
      pagesData.value = data.data;
    } else if (data && Array.isArray(data.rows)) {
      pagesData.value = data.rows;
    } else if (data && typeof data === 'object' && data._provider) {
      // Google Analytics format: object with numeric string keys
      // Convert to array by filtering out metadata fields
      pagesData.value = Object.keys(data)
        .filter((key) => key !== '_provider' && key !== '_error')
        .map((key) => data[key])
        .filter((item) => item && typeof item === 'object');
    } else {
      pagesData.value = [];
    }
  } catch (err) {
    console.error('Error loading pages data:', err);
    error.value = 'Failed to load pages data';
    pagesData.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * Format numbers with K/M suffixes
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

/**
 * Get page title from URL
 */
const getPageTitle = (url) => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Remove leading slash and replace with readable format
    let title = path.replace(/^\//, '').replace(/\//g, ' › ');

    // If it's the root path, show as "Home"
    if (path === '/' || path === '') {
      return 'Home';
    }

    // Capitalize first letter of each segment
    title = title
      .split(' › ')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' › ');

    return title || 'Unknown Page';
  } catch (error) {
    return 'Unknown Page';
  }
};

/**
 * Get page path from full URL
 */
const getPagePath = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname || '/';
  } catch (error) {
    return url || '/';
  }
};

// Computed properties
const topPages = computed(() => {
  if (!Array.isArray(pagesData.value)) return [];

  // Group by page URL and sum up the stats
  const grouped = pagesData.value.reduce((acc, item) => {
    const pageUrl = item.page_url || '';
    if (!acc[pageUrl]) {
      acc[pageUrl] = {
        page_url: pageUrl,
        page_title: item.page_title || '',
        total_views: 0,
        total_unique_visitors: 0,
      };
    }
    acc[pageUrl].total_views += parseInt(item.total_views || item.views || 0);
    acc[pageUrl].total_unique_visitors += parseInt(
      item.total_unique_visitors || item.unique_visitors || 0
    );
    return acc;
  }, {});

  // Convert to array, sort by views, and limit to top 10
  return Object.values(grouped)
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 10);
});

/**
 * Get max views for percentage calculation
 */
const maxViews = computed(() => {
  if (topPages.value.length === 0) return 0;
  return Math.max(...topPages.value.map((page) => page.total_views));
});

/**
 * Calculate percentage width for progress bar
 */
const getPercentageWidth = (views) => {
  if (maxViews.value === 0) return 0;
  return (views / maxViews.value) * 100;
};

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    loadPagesData();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload pages data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadPagesData();
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
          {{ __('Top Pages', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Most visited pages', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-brand-500"></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ topPages.length }} {{ __('pages', 'flexify-dashboard') }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between py-2">
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
            <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
          </div>
          <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-12"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <AppIcon icon="error" class="text-3xl text-zinc-400 mx-auto mb-3" />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ error }}</p>
      <button
        @click="loadPagesData"
        class="mt-2 text-brand-600 dark:text-brand-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Pages Data -->
    <div v-else-if="topPages && topPages.length > 0" class="space-y-1">
      <!-- Header Row -->
      <div
        class="flex items-center justify-between py-2 px-0 text-xs font-medium text-zinc-500 dark:text-zinc-400"
      >
        <span>{{ __('PAGE', 'flexify-dashboard') }}</span>
        <span>{{ __('VISITORS', 'flexify-dashboard') }}</span>
      </div>

      <!-- Pages List -->
      <div class="space-y-2">
        <div
          v-for="(page, index) in topPages"
          :key="page.page_url"
          class="relative rounded-lg overflow-hidden group -mx-3"
        >
          <!-- Progress Bar Background -->
          <div
            class="absolute inset-0 bg-zinc-200 dark:bg-zinc-700/20 transition-all duration-300"
            :style="{
              width: getPercentageWidth(page.total_views) + '%',
            }"
          ></div>

          <!-- Content -->
          <div
            class="relative flex items-center justify-between py-2 px-4 transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-700/20"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <div
                    class="text-xs text-zinc-600 dark:text-zinc-300 truncate font-medium"
                  >
                    {{ getPagePath(page.page_url) }}
                  </div>
                </div>
              </div>
            </div>
            <div
              class="text-sm font-bold text-zinc-900 dark:text-zinc-100 ml-4"
            >
              {{ formatNumber(page.total_views) }}
            </div>
          </div>
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
        {{ __('No page data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{
          __('Page data will appear when visitors browse your site', 'flexify-dashboard')
        }}
      </p>
    </div>
  </div>
</template>
