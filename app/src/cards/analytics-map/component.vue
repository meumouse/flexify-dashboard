<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
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
const mapContainer = ref(null);
const map = ref(null);
const geoData = ref([]);
const loading = ref(false);
const error = ref(null);
const providerError = ref(null);
const userLocation = ref(null);
const mapStyle = ref('dark'); // Will be auto-detected

/**
 * Detect if app is in dark mode
 */
const isDarkMode = () => {
  return document.documentElement.classList.contains('dark');
};

/**
 * Get user's current location
 */
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve([longitude, latitude]);
      },
      (error) => {
        console.log('Geolocation error:', error.message);
        resolve(null); // Don't reject, just return null
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

/**
 * Load geographic analytics data using queue
 */
const loadGeoData = async () => {
  loading.value = true;
  error.value = null;
  providerError.value = null;

  try {
    // Format dates for API (ISO 8601 format)
    const startDate = props.dateRange[0].toISOString();
    const endDate = props.dateRange[1].toISOString();

    // Use queue to get geo stats
    const data = await analytics.getGeo(startDate, endDate, {
      cacheMaxAge: 30000, // 30 seconds cache
    });

    // Check for provider-level errors (like permission denied)
    if (data?._error) {
      providerError.value = data._error;
    }

    // Ensure geoData is always an array
    // The API might return an object with metadata properties like _provider, _error
    // The actual geo data could be in a 'data' property or the response itself if it's an array
    // Handle Google Analytics format: object with numeric keys and _provider field
    if (Array.isArray(data)) {
      geoData.value = data;
    } else if (data && Array.isArray(data.data)) {
      geoData.value = data.data;
    } else if (data && Array.isArray(data.rows)) {
      geoData.value = data.rows;
    } else if (data && typeof data === 'object' && data._provider) {
      // Google Analytics format: object with numeric string keys
      // Convert to array by filtering out metadata fields
      geoData.value = Object.keys(data)
        .filter((key) => key !== '_provider' && key !== '_error')
        .map((key) => data[key])
        .filter((item) => item && typeof item === 'object');
    } else {
      geoData.value = [];
    }

    if (map.value) {
      updateMapData();
    }
  } catch (err) {
    console.error('Error loading geo data:', err);
    error.value = 'Failed to load geographic data';
    geoData.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * Convert analytics data to GeoJSON format
 */
const convertToGeoJSON = (data) => {
  if (!Array.isArray(data)) return { type: 'FeatureCollection', features: [] };

  const features = data.map((item) => {
    // For now, we'll use approximate coordinates based on country codes
    // In a real implementation, you'd have lat/lng from your analytics data
    const coordinates = getCountryCoordinates(item.country_code);

    return {
      type: 'Feature',
      properties: {
        country: item.country_code,
        city: item.city || null,
        visits: parseInt(item.total_views || item.views || 0),
        uniqueVisitors: parseInt(
          item.total_unique_visitors || item.unique_visitors || 0
        ),
      },
      geometry: {
        type: 'Point',
        coordinates: coordinates,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features: features,
  };
};

/**
 * Get approximate coordinates for country codes
 */
const getCountryCoordinates = (countryCode) => {
  const coordinates = {
    US: [-95.7129, 37.0902],
    GB: [-3.436, 55.3781],
    CA: [-106.3468, 56.1304],
    AU: [133.7751, -25.2744],
    DE: [10.4515, 51.1657],
    FR: [2.2137, 46.2276],
    IT: [12.5674, 41.8719],
    ES: [-3.7492, 40.4637],
    NL: [5.2913, 52.1326],
    SE: [18.6435, 60.1282],
    NO: [8.4689, 60.472],
    DK: [9.5018, 56.2639],
    FI: [25.7482, 61.9241],
    CH: [8.2275, 46.8182],
    AT: [14.5501, 47.5162],
    BE: [4.4699, 50.5039],
    IE: [-8.2439, 53.4129],
    NZ: [174.886, -40.9006],
    JP: [138.2529, 36.2048],
    KR: [127.7669, 35.9078],
    CN: [104.1954, 35.8617],
    IN: [78.9629, 20.5937],
    BR: [-51.9253, -14.235],
    MX: [-102.5528, 23.6345],
    AR: [-63.6167, -38.4161],
    CL: [-71.543, -35.6751],
    CO: [-74.2973, 4.5709],
    PE: [-75.0152, -9.19],
    ZA: [22.9375, -30.5595],
    EG: [30.8025, 26.0975],
    NG: [8.6753, 9.082],
    KE: [37.9062, -0.0236],
    MA: [-7.0926, 31.6295],
    RU: [105.3188, 61.524],
    TR: [35.2433, 38.9637],
    SA: [45.0792, 23.8859],
    AE: [53.8478, 23.4241],
    IL: [34.8516, 31.0461],
    TH: [100.9925, 15.87],
    VN: [108.2772, 14.0583],
    ID: [113.9213, -0.7893],
    MY: [101.9758, 4.2105],
    SG: [103.8198, 1.3521],
    PH: [121.774, 12.8797],
    HK: [114.1095, 22.3964],
    TW: [120.9605, 23.6978],
  };

  return coordinates[countryCode] || [0, 0];
};

/**
 * Initialize Mapbox map
 */
const initializeMap = async () => {
  if (!mapContainer.value) return;

  try {
    // Load Mapbox GL JS dynamically
    const mapboxgl = await import('mapbox-gl');

	const mapboxToken = '';

	if ( ! mapboxToken ) {
		throw new Error('Missing Mapbox access token');
	}

    // Set your Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Auto-detect dark mode
    const isDark = isDarkMode();
    mapStyle.value = isDark ? 'dark' : 'light';

    // Get user location for centering
    userLocation.value = await getUserLocation();

    // Determine map center - use user location if available, otherwise world view
    const center = userLocation.value || [0, 20];
    const zoom = 1.5; // Closer zoom if we have user location

    // Create 2D world map
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
      pitch: 0, // Ensure 2D view (no tilt)
      bearing: 0, // No rotation
      projection: 'mercator', // Use standard 2D projection
      attributionControl: false,
    });

    map.value.on('load', () => {
      setupMapLayers();
      if (geoData.value.length > 0) {
        updateMapData();
      }
    });

    // Add navigation controls
    map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add scale control
    map.value.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );
  } catch (err) {
    console.error('Error initializing map:', err);
    error.value = 'Failed to initialize map';
  }
};

/**
 * Setup map layers for visualization
 */
const setupMapLayers = () => {
  if (!map.value) return;

  // Add visits data source
  map.value.addSource('visits', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  // Add circle layer for visit visualization
  map.value.addLayer({
    id: 'visits-circles',
    type: 'circle',
    source: 'visits',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'visits'],
        0,
        4,
        100,
        8,
        1000,
        16,
        10000,
        32,
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'visits'],
        0,
        '#3b82f6',
        100,
        '#8b5cf6',
        1000,
        '#f59e0b',
        10000,
        '#ef4444',
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.5,
    },
  });

  // Add hover effect
  map.value.on('mouseenter', 'visits-circles', () => {
    map.value.getCanvas().style.cursor = 'pointer';
  });

  map.value.on('mouseleave', 'visits-circles', () => {
    map.value.getCanvas().style.cursor = '';
  });
};

/**
 * Update map with new data
 */
const updateMapData = () => {
  if (!map.value || !map.value.getSource('visits')) return;

  const geoJsonData = convertToGeoJSON(geoData.value);
  map.value.getSource('visits').setData(geoJsonData);
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

// Computed properties
const totalVisits = computed(() => {
  return geoData.value.reduce(
    (sum, item) => sum + parseInt(item.total_views || item.views || 0),
    0
  );
});

const totalCountries = computed(() => {
  return new Set(geoData.value.map((item) => item.country_code)).size;
});

/**
 * Destroy and recreate the map instance
 */
const recreateMap = async () => {
  // Destroy existing map if it exists
  if (map.value) {
    map.value.remove();
    map.value = null;
  }

  // Clear the map container
  if (mapContainer.value) {
    mapContainer.value.innerHTML = '';
  }

  // Load new data and recreate map
  await loadGeoData();
  await nextTick();
  await initializeMap();
};

// Watch for date range changes
watch(
  () => props.dateRange,
  () => {
    recreateMap();
  },
  { deep: true }
);

onMounted(async () => {
  await loadGeoData();
  await nextTick();
  await initializeMap();
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>

<template>
  <div
    class="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/40 dark:border-zinc-800/60 rounded-3xl p-6 flex flex-col pb-3 h-full"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {{ __('Analytics Map', 'flexify-dashboard') }}
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Visitor locations worldwide', 'flexify-dashboard') }}
        </p>
      </div>
      <div class="flex items-center gap-4">
        <!-- Stats -->
        <div
          class="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full bg-brand-500"></div>
            <span
              >{{ formatNumber(totalVisits) }}
              {{ __('visits', 'flexify-dashboard') }}</span
            >
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>{{ totalCountries }} {{ __('countries', 'flexify-dashboard') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center h-80">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-brand-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading map data...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center h-80">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-2">
          {{ error }}
        </p>
        <button
          @click="loadGeoData"
          class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          {{ __('Try again', 'flexify-dashboard') }}
        </button>
      </div>
    </div>

    <!-- Provider Error State (e.g., permission denied) -->
    <div
      v-else-if="providerError"
      class="flex-1 flex items-center justify-center p-4"
    >
      <div
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 max-w-md"
      >
        <div class="flex items-start gap-3">
          <AppIcon
            icon="warning"
            class="text-2xl text-amber-500 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2"
            >
              {{ __('Google Analytics Connection Issue', 'flexify-dashboard') }}
            </p>
            <p
              class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mb-3"
            >
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
                @click="loadGeoData"
                class="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {{ __('Retry', 'flexify-dashboard') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Map Container -->
    <div v-else class="flex-1 relative -mx-3">
      <div
        ref="mapContainer"
        class="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700/40 aspect-video"
      ></div>

      <!-- Map Legend -->
      <div
        class="absolute bottom-4 left-4 bg-white dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 shadow-lg"
      >
        <div class="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {{ __('Visit Volume', 'flexify-dashboard') }}
        </div>
        <div class="space-y-1">
          <div
            class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <div class="w-3 h-3 rounded-full bg-brand-500"></div>
            <span>{{ __('Low', 'flexify-dashboard') }}</span>
          </div>
          <div
            class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <div class="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>{{ __('Medium', 'flexify-dashboard') }}</span>
          </div>
          <div
            class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <div class="w-5 h-5 rounded-full bg-orange-500"></div>
            <span>{{ __('High', 'flexify-dashboard') }}</span>
          </div>
          <div
            class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <div class="w-6 h-6 rounded-full bg-red-500"></div>
            <span>{{ __('Very High', 'flexify-dashboard') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div
      v-if="!loading && !error && geoData.length === 0"
      class="flex-1 flex items-center justify-center h-80 mt-8"
    >
      <div class="text-center">
        <AppIcon
          icon="public"
          class="text-4xl text-zinc-300 dark:text-zinc-600 mx-auto mb-3"
        />
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('No location data available', 'flexify-dashboard') }}
        </p>
        <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {{
            __(
              'Location data will appear when visitors browse your site',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>
    </div>
  </div>
</template>
