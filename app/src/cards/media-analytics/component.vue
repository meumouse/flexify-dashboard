<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

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

/**
 * Load media analytics data
 */
const loadAnalytics = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/media-analytics',
      type: 'GET',
    });

    analytics.value = response.data;
  } catch (err) {
    error.value = err.message || 'Failed to load media analytics';
    console.error('Media analytics error:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Format file size
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
 * Get file type color
 */
const getFileTypeColor = (fileType) => {
  const colors = {
    image: 'text-indigo-600 dark:text-indigo-400',
    video: 'text-purple-600 dark:text-purple-400',
    audio: 'text-green-600 dark:text-green-400',
    application: 'text-orange-600 dark:text-orange-400',
    text: 'text-gray-600 dark:text-gray-400',
  };

  return colors[fileType] || 'text-zinc-600 dark:text-zinc-400';
};

/**
 * Get file type icon
 */
const getFileTypeIcon = (fileType) => {
  const icons = {
    image: 'image',
    video: 'play_circle',
    audio: 'music_note',
    font: 'font_download',
    application: 'description',
    text: 'text_snippet',
  };

  return icons[fileType] || 'insert_drive_file';
};

// Computed properties
const totalFiles = computed(() => analytics.value?.total_files || 0);
const totalSize = computed(
  () => analytics.value?.total_size_formatted || '0 B'
);
const recentUploads = computed(() => analytics.value?.recent_uploads || 0);
const unusedMedia = computed(() => analytics.value?.unused_media || 0);
const largeFiles = computed(() => analytics.value?.large_files || 0);
const fileTypes = computed(() => analytics.value?.file_types || []);

// Watch for date range changes (though media analytics doesn't depend on date range)
watch(
  () => props.dateRange,
  () => {
    // Media analytics doesn't change based on date range, but we can reload if needed
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
    class="bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl p-6 h-full flex flex-col border border-zinc-200/40 dark:border-zinc-800/60"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading media analytics...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon icon="error" class="text-4xl text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-2">
          {{ __('Failed to load media analytics', 'flexify-dashboard') }}
        </p>
        <button
          @click="loadAnalytics"
          class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          {{ __('Try again', 'flexify-dashboard') }}
        </button>
      </div>
    </div>

    <!-- Analytics Data -->
    <div v-else-if="analytics" class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ __('Media Analytics', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ __('Media library overview', 'flexify-dashboard') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="grid grid-cols-2 gap-4 py-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {{ totalFiles.toLocaleString() }}
          </div>
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Total Files', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {{ totalSize }}
          </div>
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Total Size', 'flexify-dashboard') }}
          </div>
        </div>
      </div>

      <!-- File Type Breakdown -->
      <div v-if="fileTypes.length > 0" class="space-y-3">
        <h4 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {{ __('File Types', 'flexify-dashboard') }}
        </h4>
        <div class="space-y-2">
          <div
            v-for="fileType in fileTypes.slice(0, 4)"
            :key="fileType.file_type"
            class="flex items-center justify-between p-3 bg-white dark:bg-zinc-800/40 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group"
          >
            <div class="flex items-center gap-3">
              <AppIcon
                :icon="getFileTypeIcon(fileType.file_type)"
                class="text-lg"
                :class="getFileTypeColor(fileType.file_type)"
              />
              <div>
                <div
                  class="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize"
                >
                  {{ fileType.file_type }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
              >
                {{ fileType.count.toLocaleString() }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Stats -->
      <div class="grid grid-cols-2 gap-3">
        <div class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {{ recentUploads.toLocaleString() }}
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ __('Recent (30d)', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {{ unusedMedia.toLocaleString() }}
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ __('Unused', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {{ largeFiles.toLocaleString() }}
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ __('Large Files', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="text-center p-3 bg-white dark:bg-zinc-800/40 rounded-xl">
          <div class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {{ analytics.disk_usage?.formatted || '0 B' }}
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400">
            {{ __('Disk Usage', 'flexify-dashboard') }}
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="grow flex items-end justify-end">
        <a
          :href="props.appData.adminUrl + 'upload.php'"
          class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-2"
        >
          <span>{{ __('Manage Media', 'flexify-dashboard') }}</span>
          <AppIcon
            icon="chevron_right"
            class="text-xs transition-transform duration-200 group-hover:translate-x-1"
          />
        </a>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AppIcon
          icon="folder_open"
          class="text-4xl text-zinc-400 mx-auto mb-3"
        />
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('No media data available', 'flexify-dashboard') }}
        </p>
      </div>
    </div>
  </div>
</template>
