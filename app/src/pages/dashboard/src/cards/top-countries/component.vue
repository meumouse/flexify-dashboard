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
const countriesData = ref([]);
const loading = ref(false);
const error = ref(null);

/**
 * Load top countries data based on date range using queue
 */
const loadCountriesData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get geo stats
    const data = await analytics.getGeo(startDate, endDate, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Ensure countriesData is always an array (API might return object with metadata)
    // Handle Google Analytics format: object with numeric keys and _provider field
    if (Array.isArray(data)) {
      countriesData.value = data;
    } else if (data && Array.isArray(data.data)) {
      countriesData.value = data.data;
    } else if (data && Array.isArray(data.rows)) {
      countriesData.value = data.rows;
    } else if (data && typeof data === 'object' && data._provider) {
      // Google Analytics format: object with numeric string keys
      // Convert to array by filtering out metadata fields
      countriesData.value = Object.keys(data)
        .filter((key) => key !== '_provider' && key !== '_error')
        .map((key) => data[key])
        .filter((item) => item && typeof item === 'object');
    } else {
      countriesData.value = [];
    }
  } catch (err) {
    console.error('Error loading countries data:', err);
    error.value = 'Failed to load countries data';
    countriesData.value = [];
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
 * Get country name from country code
 */
const getCountryName = (countryCode) => {
  const countryNames = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    CH: 'Switzerland',
    AT: 'Austria',
    BE: 'Belgium',
    IE: 'Ireland',
    NZ: 'New Zealand',
    JP: 'Japan',
    KR: 'South Korea',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    MX: 'Mexico',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    ZA: 'South Africa',
    EG: 'Egypt',
    NG: 'Nigeria',
    KE: 'Kenya',
    MA: 'Morocco',
    RU: 'Russia',
    TR: 'Turkey',
    SA: 'Saudi Arabia',
    AE: 'United Arab Emirates',
    IL: 'Israel',
    TH: 'Thailand',
    VN: 'Vietnam',
    ID: 'Indonesia',
    MY: 'Malaysia',
    SG: 'Singapore',
    PH: 'Philippines',
    HK: 'Hong Kong',
    TW: 'Taiwan',
  };

  return countryNames[countryCode] || countryCode || 'Unknown';
};

/**
 * Get country flag emoji
 */
const getCountryFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    return '🌍';
  }
};

// Computed properties
const topCountries = computed(() => {
  if (!Array.isArray(countriesData.value)) return [];

  // Group by country code and sum up the stats
  const grouped = countriesData.value.reduce((acc, item) => {
    const countryCode = item.country_code || 'Unknown';
    if (!acc[countryCode]) {
      acc[countryCode] = {
        country_code: countryCode,
        total_views: 0,
        total_unique_visitors: 0,
      };
    }
    acc[countryCode].total_views += parseInt(
      item.total_views || item.views || 0
    );
    acc[countryCode].total_unique_visitors += parseInt(
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
  if (topCountries.value.length === 0) return 0;
  return Math.max(...topCountries.value.map((country) => country.total_views));
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
    loadCountriesData();
  },
  { deep: true }
);

// Watch for app data changes
watch(
  () => props.appData,
  () => {
    // Could reload countries data based on app data changes
  },
  { deep: true }
);

onMounted(() => {
  loadCountriesData();
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
          {{ __('Top Countries', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Most visitors by country', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-brand-500"></div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ topCountries.length }} {{ __('countries', 'flexify-dashboard') }}
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
        @click="loadCountriesData"
        class="mt-2 text-brand-600 dark:text-brand-400 text-sm hover:underline"
      >
        {{ __('Retry', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Countries Data -->
    <div v-else-if="topCountries && topCountries.length > 0" class="space-y-1">
      <!-- Header Row -->
      <div
        class="flex items-center justify-between py-2 px-0 text-xs font-medium text-zinc-500 dark:text-zinc-400"
      >
        <span>{{ __('COUNTRY', 'flexify-dashboard') }}</span>
        <span>{{ __('VISITORS', 'flexify-dashboard') }}</span>
      </div>

      <!-- Countries List -->
      <div class="space-y-2">
        <div
          v-for="(country, index) in topCountries"
          :key="country.country_code"
          class="relative rounded-lg overflow-hidden group -mx-3"
        >
          <!-- Progress Bar Background -->
          <div
            class="absolute inset-0 bg-zinc-200 dark:bg-zinc-700/20 transition-all duration-300"
            :style="{
              width: getPercentageWidth(country.total_views) + '%',
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
                    <span class="text-base">{{
                      getCountryFlag(country.country_code)
                    }}</span>
                    <span>{{ getCountryName(country.country_code) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="text-sm font-bold text-zinc-900 dark:text-zinc-100 ml-4"
            >
              {{ formatNumber(country.total_views) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-8">
      <AppIcon
        icon="public"
        class="text-3xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
      />
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ __('No country data available', 'flexify-dashboard') }}
      </p>
      <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
        {{
          __(
            'Country data will appear when visitors browse your site',
            'flexify-dashboard'
          )
        }}
      </p>
    </div>
  </div>
</template>
