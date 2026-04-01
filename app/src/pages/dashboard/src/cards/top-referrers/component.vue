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
const referrersData = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load top referrers data based on date range using queue
 */
const loadReferrersData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get referrers stats
    const data = await analytics.getReferrers(startDate, endDate, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Ensure referrersData is always an array (API might return object with metadata)
    // Handle Google Analytics format: object with numeric keys and _provider field
    if (Array.isArray(data)) {
      referrersData.value = data;
    } else if (data && Array.isArray(data.data)) {
      referrersData.value = data.data;
    } else if (data && Array.isArray(data.rows)) {
      referrersData.value = data.rows;
    } else if (data && typeof data === 'object' && data._provider) {
      // Google Analytics format: object with numeric string keys
      // Convert to array by filtering out metadata fields
      referrersData.value = Object.keys(data)
        .filter((key) => key !== '_provider' && key !== '_error')
        .map((key) => data[key])
        .filter((item) => item && typeof item === 'object');
    } else {
      referrersData.value = [];
    }
  } catch (err) {
    console.error('Error loading referrers data:', err);
    error.value = 'Failed to load referrers data';
    referrersData.value = [];
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
 * Get referrer display name
 */
const getReferrerName = (referrerDomain) => {
  if (!referrerDomain || referrerDomain === 'direct') {
    return 'Direct';
  }

  // Remove www. prefix if present
  const cleanDomain = referrerDomain.replace(/^www\./, '');

  // Capitalize first letter
  return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
};

/**
 * Get favicon URL from Google's favicon service
 */
const getFaviconUrl = (referrerDomain, size = 16) => {
  if (!referrerDomain || referrerDomain === 'direct') {
    return null;
  }

  // Ensure we have a clean domain
  const cleanDomain = referrerDomain.replace(/^www\./, '');
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`;
};

// Computed properties
const topReferrers = computed(() => {
  if (!Array.isArray(referrersData.value)) return [];

  // Group by referrer domain and sum up the stats
  const grouped = referrersData.value.reduce((acc, item) => {
    const referrerDomain = item.referrer_domain || 'direct';
    if (!acc[referrerDomain]) {
      acc[referrerDomain] = {
        referrer_domain: referrerDomain,
        total_views: 0,
        total_unique_visitors: 0,
      };
    }
    acc[referrerDomain].total_views += parseInt(
      item.total_views || item.total_visits || item.views || 0
    );
    acc[referrerDomain].total_unique_visitors += parseInt(
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
  if (topReferrers.value.length === 0) return 0;
  return Math.max(
    ...topReferrers.value.map((referrer) => referrer.total_views)
  );
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
    loadReferrersData();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload referrers data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadReferrersData();
});
</script>

<template>
  <div
    class="bg-white dark:bg-[#24303f] border border-zinc-200/40 dark:border-[#2e3a47] rounded-3xl p-6 flex flex-col h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __('Top Referrers', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Most traffic sources', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-brand-500"></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ topReferrers.length }} {{ __('sources', 'flexify-dashboard') }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between py-2">
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
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
        @click="loadReferrersData"
        class="mt-2 text-brand-600 dark:text-brand-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Referrers Data -->
    <div v-else-if="topReferrers && topReferrers.length > 0" class="space-y-1">
      <!-- Header Row -->
      <div
        class="flex items-center justify-between py-2 px-0 text-xs font-medium text-zinc-500 dark:text-zinc-400"
      >
        <span>{{ __('SOURCE', 'flexify-dashboard') }}</span>
        <span>{{ __('VISITORS', 'flexify-dashboard') }}</span>
      </div>

      <!-- Referrers List -->
      <div class="space-y-2">
        <div
          v-for="(referrer, index) in topReferrers"
          :key="referrer.referrer_domain"
          class="relative rounded-lg overflow-hidden group -mx-3"
        >
          <!-- Progress Bar Background -->
          <div
            class="absolute inset-0 bg-zinc-200 dark:bg-zinc-700/20 transition-all duration-300"
            :style="{
              width: getPercentageWidth(referrer.total_views) + '%',
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
                    class="text-xs text-zinc-600 dark:text-zinc-300 truncate font-medium flex items-center gap-2"
                  >
                    <div
                      class="w-5 h-5 rounded-md flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                    >
                      <img
                        v-if="getFaviconUrl(referrer.referrer_domain)"
                        :src="getFaviconUrl(referrer.referrer_domain)"
                        :alt="getReferrerName(referrer.referrer_domain)"
                        class="w-4 h-4 object-contain"
                        @error="$event.target.style.display = 'none'"
                      />
                      <AppIcon
                        v-else
                        icon="link"
                        class="text-xs text-zinc-500 dark:text-zinc-400"
                      />
                    </div>
                    <span>{{ getReferrerName(referrer.referrer_domain) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="text-sm font-bold text-zinc-900 dark:text-zinc-100 ml-4"
            >
              {{ formatNumber(referrer.total_views) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-8">
      <AppIcon
        icon="link"
        class="text-3xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
      />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No referrer data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{
          __(
            'Referrer data will appear when visitors arrive from external sources',
            'flexify-dashboard'
          )
        }}
      </p>
    </div>
  </div>
</template>
