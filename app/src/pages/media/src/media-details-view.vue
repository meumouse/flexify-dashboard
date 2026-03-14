<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from './useDarkMode.js';
import { useImageOptimization } from '@/composables/useImageOptimization.js';
const { isDark } = useDarkMode();
const {
  isOptimizing,
  optimizationProgress,
  optimizationError,
  status: optimizationStatus,
  optimizeImage,
  getCompressionStats,
  supportsWebP,
} = useImageOptimization();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppTextArea from '@/components/utility/text-area/index.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import TagInput from '@/components/utility/tag-input/index.vue';

const route = useRoute();
const router = useRouter();

// Refs
const loading = ref(false);
const mediaItem = ref(null);
const hasChanges = ref(false);
const isSaving = ref(false);
const selectedSize = ref('full');
const isReplacingFile = ref(false);
const fileInput = ref(null);
const dragOver = ref(false);
const showSuccessMessage = ref(false);
const userConfirm = ref(null);

// Editable fields
const title = ref('');
const altText = ref('');
const caption = ref('');

// Tags
const tags = ref([]);
const allTags = ref([]);
const isSavingTags = ref(false);
const mediaUsage = ref([]);
const isLoadingUsage = ref(false);

/**
 * Fetches media item data by ID from WordPress REST API
 */
const getMediaItem = async () => {
  if (!route.params.mediaId) return;

  loading.value = true;
  appStore.updateState('loading', true);

  const args = {
    endpoint: `wp/v2/media/${route.params.mediaId}`,
    params: {
      context: 'edit',
    },
  };

  const data = await lmnFetch(args);

  loading.value = false;
  appStore.updateState('loading', false);

  if (!data?.data) {
    notify({
      title: __('Media item not found', 'flexify-dashboard'),
      type: 'error',
    });
    router.push({ name: 'media-library' });
    return;
  }

  mediaItem.value = data.data;
  title.value = mediaItem.value.title?.rendered || '';
  altText.value = mediaItem.value.alt_text || '';
  caption.value = mediaItem.value.caption?.rendered || '';
  tags.value = mediaItem.value.media_tags || [];
  hasChanges.value = false;

  // Fetch all available tags
  await fetchAllTags();

  // Fetch media usage
  await fetchMediaUsage();
};

// Available image sizes
const imageSizes = computed(() => {
  if (
    !mediaItem.value?.mime_type.startsWith('image/') ||
    !mediaItem.value?.media_details?.sizes
  ) {
    return [];
  }

  const sizes = [
    {
      ...mediaItem.value.media_details,
      source_url: mediaItem.value.source_url,
    },
  ];

  Object.entries(mediaItem.value.media_details.sizes).forEach(([key, size]) => {
    sizes.push({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      ...size,
    });
  });

  return sizes.reverse();
});

// Current image URL based on selected size
const currentImageUrl = computed(() => {
  if (!mediaItem.value) return '';
  if (selectedSize.value === 'full') return mediaItem.value.source_url;
  return (
    mediaItem.value.media_details?.sizes?.[selectedSize.value]?.source_url ||
    mediaItem.value.source_url
  );
});

/**
 * Track changes
 */
watch([title, altText, caption], () => {
  if (!mediaItem.value) return;
  hasChanges.value =
    title.value !== (mediaItem.value.title?.rendered || '') ||
    altText.value !== (mediaItem.value.alt_text || '') ||
    caption.value !== (mediaItem.value.caption?.rendered || '');
});

/**
 * Save changes
 */
const saveChanges = async () => {
  if (!hasChanges.value) return;

  isSaving.value = true;

  try {
    const args = {
      endpoint: `wp/v2/media/${mediaItem.value.id}`,
      type: 'POST',
      data: {
        title: title.value,
        alt_text: altText.value,
        caption: caption.value,
      },
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('Saved', 'flexify-dashboard'),
        type: 'success',
      });
      await getMediaItem();
    }
  } catch (error) {
    notify({
      title: __('Save failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
  }
};

/**
 * Auto-save on blur
 */
const handleBlur = () => {
  if (hasChanges.value) {
    saveChanges();
  }
};

/**
 * Delete media item
 */
const deleteMedia = async () => {
  const userIntent = await userConfirm.value.show({
    title: __('Delete file', 'flexify-dashboard'),
    message: __('This will permantantly delete the file. Proceed?', 'flexify-dashboard'),
    okButton: __('Delete', 'flexify-dashboard'),
  });

  if (!userIntent) return;

  loading.value = true;

  try {
    await lmnFetch({
      endpoint: `wp/v2/media/${mediaItem.value.id}`,
      type: 'DELETE',
      params: {
        force: true,
      },
    });

    notify({
      title: __('Deleted', 'flexify-dashboard'),
      type: 'success',
    });

    router.push({ name: 'media-library' });
  } catch (error) {
    notify({
      title: __('Delete failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + ' ' + sizes[i];
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get file type icon
 */
const getFileTypeIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'videocam';
  if (mimeType.startsWith('audio/')) return 'audiotrack';
  if (mimeType.startsWith('font/') || mimeType.includes('font'))
    return 'font_download';
  if (mimeType.includes('pdf')) return 'picture_as_pdf';
  if (mimeType.includes('application/zip')) return 'archive';
  return 'attachment';
};

/**
 * Copy to clipboard
 */
const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    notify({
      title: `${label} copied`,
      type: 'success',
    });
  } catch (error) {
    notify({
      title: __('Copy failed', 'flexify-dashboard'),
      type: 'error',
    });
  }
};

/**
 * Handle file replacement
 */
const replaceFile = async (file) => {
  if (!file || !mediaItem.value) return;

  isReplacingFile.value = true;

  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'replace_media_file');
    formData.append('media_id', mediaItem.value.id);

    const args = {
      endpoint: 'flexify-dashboard/v1/media/replace',
      type: 'POST',
      data: formData,
      isFormData: true,
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      notify({
        title: __('File replaced successfully', 'flexify-dashboard'),
        type: 'success',
      });
      // Show success message
      showSuccessMessage.value = true;
      setTimeout(() => {
        showSuccessMessage.value = false;
      }, 3000);
      // Refresh the media item to get updated data
      await getMediaItem();
    }
  } catch (error) {
    console.error('File replacement error:', error);
    notify({
      title: __('File replacement failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isReplacingFile.value = false;
  }
};

/**
 * Handle file input change
 */
const handleFileInput = (event) => {
  const file = event.target.files[0];
  if (file) {
    replaceFile(file);
  }
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

/**
 * Handle drag and drop
 */
const handleDragOver = (event) => {
  event.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  dragOver.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  dragOver.value = false;

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    replaceFile(files[0]);
  }
};

/**
 * Trigger file input
 */
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

/**
 * Optimize and replace image
 */
const optimizeAndReplaceImage = async () => {
  if (!mediaItem.value || !mediaItem.value.mime_type.startsWith('image/')) {
    notify({
      title: __('Only images can be optimized', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  const userIntent = await userConfirm.value.show({
    title: __('Optimise image', 'flexify-dashboard'),
    message: __(
      'This will permantantly optimise the image and convert to webp format.',
      'flexify-dashboard'
    ),
    okButton: __('Convert', 'flexify-dashboard'),
  });

  if (!userIntent) return;

  try {
    // Fetch the current image
    const response = await fetch(mediaItem.value.source_url);
    const blob = await response.blob();
    const originalFile = new File(
      [blob],
      mediaItem.value.media_details?.file || 'image.jpg',
      {
        type: mediaItem.value.mime_type,
      }
    );

    // Optimize the image
    const optimizedFile = await optimizeImage(originalFile, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      quality: 0.8,
      convertToWebP: true,
    });

    // Get compression stats
    const stats = getCompressionStats(originalFile.size, optimizedFile.size);

    // Show compression info
    notify({
      title: __('Image optimized', 'flexify-dashboard'),
      message: `Reduced by ${stats.savedPercentage}% (${stats.savedBytes} saved)`,
      type: 'success',
    });

    // Replace the file with optimized version
    await replaceFile(optimizedFile);
  } catch (error) {
    console.error('Image optimization error:', error);
    notify({
      title: __('Optimization failed', 'flexify-dashboard'),
      type: 'error',
    });
  }
};

/**
 * Navigate to image editor
 */
const editImage = () => {
  if (!mediaItem.value || !mediaItem.value.mime_type.startsWith('image/')) {
    notify({
      title: __('Only images can be edited', 'flexify-dashboard'),
      type: 'error',
    });
    return;
  }

  router.push({
    name: 'media-edit',
    params: { mediaId: route.params.mediaId },
  });
};

/**
 * Fetch all available tags
 */
const fetchAllTags = async () => {
  try {
    const data = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/media/tags',
    });

    if (data?.data) {
      allTags.value = data.data;
    }
  } catch (error) {
    console.error('Failed to fetch tags:', error);
  }
};

/**
 * Fetch media usage information
 */
const fetchMediaUsage = async () => {
  if (!route.params.mediaId) return;

  isLoadingUsage.value = true;

  try {
    const response = await lmnFetch({
      endpoint: `flexify-dashboard/v1/media/${route.params.mediaId}/usage`,
      type: 'GET',
    });

    if (response?.data?.data) {
      mediaUsage.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Failed to fetch media usage:', error);
    mediaUsage.value = [];
  } finally {
    isLoadingUsage.value = false;
  }
};

/**
 * Handle tag added
 */
const handleTagAdd = async (tag) => {
  isSavingTags.value = true;

  try {
    // Add the new tag to the current tags array
    const updatedTagIds = [...tags.value.map((t) => t.id), tag.id];

    const data = await lmnFetch({
      endpoint: `flexify-dashboard/v1/media/${mediaItem.value.id}/tags`,
      type: 'POST',
      data: {
        tag_ids: updatedTagIds,
      },
    });

    if (data?.data?.tags) {
      tags.value = data.data.tags;
      await fetchAllTags(); // Refresh all tags list
    }
  } catch (error) {
    notify({
      title: __('Failed to add tag', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSavingTags.value = false;
  }
};

/**
 * Handle tag removed
 */
const handleTagRemove = async (tag) => {
  isSavingTags.value = true;

  try {
    const updatedTagIds = tags.value
      .filter((t) => t.id !== tag.id)
      .map((t) => t.id);

    const data = await lmnFetch({
      endpoint: `flexify-dashboard/v1/media/${mediaItem.value.id}/tags`,
      type: 'POST',
      data: {
        tag_ids: updatedTagIds,
      },
    });

    if (data?.data?.tags) {
      tags.value = data.data.tags;
    }
  } catch (error) {
    notify({
      title: __('Failed to remove tag', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSavingTags.value = false;
  }
};

/**
 * Handle tag creation
 */
const handleTagCreate = async (tagName) => {
  isSavingTags.value = true;

  try {
    const data = await lmnFetch({
      endpoint: `flexify-dashboard/v1/media/${mediaItem.value.id}/tags`,
      type: 'POST',
      data: {
        tag_ids: tags.value.map((t) => t.id),
        tag_names: [tagName],
      },
    });

    if (data?.data?.tags) {
      tags.value = data.data.tags;
      await fetchAllTags(); // Refresh all tags list
      notify({
        title: __('Tag created and added', 'flexify-dashboard'),
        type: 'success',
      });
    }
  } catch (error) {
    notify({
      title: __('Failed to create tag', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSavingTags.value = false;
  }
};

/**
 * Handle tags update (when v-model changes)
 */
const handleTagsUpdate = async (newTags) => {
  // Only update if tags actually changed
  const currentIds = tags.value
    .map((t) => t.id)
    .sort()
    .join(',');
  const newIds = newTags
    .map((t) => t.id)
    .sort()
    .join(',');

  if (currentIds === newIds) {
    return; // No change
  }

  isSavingTags.value = true;

  try {
    const data = await lmnFetch({
      endpoint: `flexify-dashboard/v1/media/${mediaItem.value.id}/tags`,
      type: 'POST',
      data: {
        tag_ids: newTags.map((t) => t.id),
      },
    });

    if (data?.data?.tags) {
      tags.value = data.data.tags;
      await fetchAllTags(); // Refresh all tags list
    }
  } catch (error) {
    notify({
      title: __('Failed to update tags', 'flexify-dashboard'),
      type: 'error',
    });
    // Revert to previous tags on error
    tags.value = [...tags.value];
  } finally {
    isSavingTags.value = false;
  }
};

// Watchers
watch(
  () => route.params.mediaId,
  () => {
    getMediaItem();
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="flex-1 flex flex-col lg:flex-row h-full max-h-full overflow-hidden"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3"
        >
          <AppIcon icon="image" class="text-xl text-zinc-400 animate-pulse" />
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ __('Loading...', 'flexify-dashboard') }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="mediaItem">
      <!-- Main Preview Area (60% width) -->
      <div
        class="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 max-h-full overflow-hidden min-h-0"
      >
        <!-- Minimal Header -->
        <div
          v-if="imageSizes.length > 0"
          class="px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800"
        >
          <div class="flex items-center gap-1 justify-between w-full">
            <!-- Size Selector (only for images) -->
            <div class="flex items-center gap-1 mr-2">
              <button
                v-for="size in imageSizes"
                :key="size.key"
                @click="selectedSize = size.key"
                :class="[
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  selectedSize === size.key
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
                ]"
              >
                {{ size.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Image Preview -->
        <div
          class="flex-1 flex items-center justify-center p-8 grow overflow-hidden max-h-full relative"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          :class="[
            dragOver
              ? 'bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-300 dark:border-zinc-600'
              : '',
          ]"
        >
          <!-- Drag Overlay -->
          <div
            v-if="dragOver"
            class="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-950/80 flex items-center justify-center z-10 rounded-lg"
          >
            <div class="text-center text-white">
              <AppIcon icon="cloud_upload" class="text-6xl mb-4 mx-auto" />
              <p class="text-xl font-medium">
                {{ __('Drop file to replace', 'flexify-dashboard') }}
              </p>
              <p class="text-sm text-zinc-300 mt-2">
                {{
                  __('Keep the same ID and regenerate thumbnails', 'flexify-dashboard')
                }}
              </p>
            </div>
          </div>

          <!-- Loading Overlay -->
          <div
            v-if="isReplacingFile"
            class="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-950/80 flex items-center justify-center z-10 rounded-lg"
          >
            <div class="text-center text-white">
              <AppIcon
                icon="refresh"
                class="text-6xl mb-4 mx-auto animate-spin"
              />
              <p class="text-xl font-medium">
                {{ __('Replacing file...', 'flexify-dashboard') }}
              </p>
              <p class="text-sm text-zinc-300 mt-2">
                {{ __('Regenerating thumbnails', 'flexify-dashboard') }}
              </p>
            </div>
          </div>

          <!-- Optimization Overlay -->
          <div
            v-if="isOptimizing"
            class="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-950/80 flex items-center justify-center z-10 rounded-lg"
          >
            <div class="text-center text-white">
              <AppIcon
                icon="low_density"
                class="text-6xl mb-4 mx-auto animate-pulse"
              />
              <p class="text-xl font-medium">
                {{ __('Optimizing image...', 'flexify-dashboard') }}
              </p>
              <p class="text-sm text-zinc-300 mt-2">
                {{ optimizationStatus.message }}
              </p>
              <!-- Progress bar -->
              <div class="w-48 bg-zinc-700 rounded-full h-2 mt-4">
                <div
                  class="bg-white h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${optimizationProgress}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Success Overlay -->
          <div
            v-if="showSuccessMessage"
            class="absolute inset-0 bg-green-600/90 dark:bg-green-700/90 flex items-center justify-center z-10 rounded-lg"
          >
            <div class="text-center text-white">
              <AppIcon icon="check_circle" class="text-6xl mb-4 mx-auto" />
              <p class="text-xl font-medium">
                {{ __('File replaced successfully!', 'flexify-dashboard') }}
              </p>
              <p class="text-sm text-green-100 mt-2">
                {{ __('Thumbnails regenerated', 'flexify-dashboard') }}
              </p>
            </div>
          </div>
          <div
            v-if="mediaItem.mime_type.startsWith('image/')"
            class="max-w-full max-h-full flex flex-col items-center justify-center overflow-hidden h-full"
          >
            <img
              :src="currentImageUrl"
              :alt="altText"
              class="max-w-full max-h-full object-contain rounded-lg shadow-2xl grow-0 shrink-1"
            />
          </div>
          <div
            v-else-if="mediaItem.mime_type.startsWith('video/')"
            class="max-w-full max-h-full flex flex-col items-center justify-center overflow-hidden h-full"
          >
            <video
              :src="mediaItem.source_url"
              controls
              class="max-w-full max-h-full object-contain rounded-lg shadow-2xl grow-0 shrink-1"
              preload="metadata"
            >
              {{
                __('Your browser does not support the video tag.', 'flexify-dashboard')
              }}
            </video>
          </div>
          <div v-else class="text-center">
            <div
              class="w-32 h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon
                :icon="getFileTypeIcon(mediaItem.mime_type)"
                class="text-5xl text-zinc-500 dark:text-zinc-400"
              />
            </div>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              {{ mediaItem.mime_type.split('/')[1].toUpperCase() }}
            </p>
            <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {{ formatFileSize(mediaItem.media_details?.filesize) }}
            </p>
          </div>
        </div>

        <!-- Image Info Bar -->
        <div
          class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400"
        >
          <div class="flex items-center gap-4">
            <span
              v-if="
                mediaItem.media_details?.width &&
                mediaItem.media_details?.height
              "
            >
              {{ mediaItem.media_details.width }} ×
              {{ mediaItem.media_details.height }}
            </span>
            <span>{{ formatFileSize(mediaItem.media_details?.filesize) }}</span>
            <span>{{ mediaItem.mime_type }}</span>
          </div>
          <span
            >{{ __('Uploaded', 'flexify-dashboard') }}
            {{ formatDate(mediaItem.date) }}</span
          >
        </div>
      </div>

      <!-- Sidebar Panel (40% width) -->
      <div
        class="w-full lg:w-[400px] flex flex-col min-h-0 lg:max-h-full overflow-hidden bg-white dark:bg-zinc-800/30"
      >
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-auto">
          <div class="p-6 space-y-6">
            <!-- Editable Fields -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
              >
                {{ __('Title', 'flexify-dashboard') }}
              </label>

              <AppInput
                v-model="title"
                @blur="handleBlur"
                :placeholder="__('Untitled', 'flexify-dashboard')"
              />
            </div>

            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
              >
                {{ __('Alt Text', 'flexify-dashboard') }}
              </label>
              <AppTextArea
                v-model="altText"
                @blur="handleBlur"
                :placeholder="
                  __('Describe the image for screen readers', 'flexify-dashboard')
                "
              />
            </div>

            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
              >
                {{ __('Caption', 'flexify-dashboard') }}
              </label>

              <AppTextArea
                v-model="caption"
                @blur="handleBlur"
                :placeholder="__('Add a caption', 'flexify-dashboard')"
              />
            </div>

            <!-- Tags Section -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2"
              >
                {{ __('Tags', 'flexify-dashboard') }}
              </label>

              <TagInput
                v-model="tags"
                :available-tags="allTags"
                :disabled="isSavingTags"
                :placeholder="__('Add tags...', 'flexify-dashboard')"
                :allow-create="true"
                @create="handleTagCreate"
                @update:modelValue="handleTagsUpdate"
              />
            </div>

            <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3"
              >
                {{ __('File URL', 'flexify-dashboard') }}
              </label>
              <AppInput
                v-model="mediaItem.source_url"
                :disabled="true"
                :copy="true"
              />
            </div>

            <!-- Quick Actions -->
            <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3"
              >
                {{ __('Actions', 'flexify-dashboard') }}
              </label>
              <div class="space-y-2">
                <AppButton
                  @click="optimizeAndReplaceImage"
                  :disabled="
                    isOptimizing || !mediaItem?.mime_type.startsWith('image/')
                  "
                  class="w-full"
                >
                  <div class="flex flex-row gap-4 items-center">
                    <AppIcon
                      :icon="isOptimizing ? 'refresh' : 'low_density'"
                      :class="['text-base', isOptimizing ? 'animate-spin' : '']"
                    />
                    <span>{{
                      isOptimizing
                        ? __('Optimizing...', 'flexify-dashboard')
                        : __('Optimize Image', 'flexify-dashboard')
                    }}</span>
                  </div>
                </AppButton>
                <AppButton
                  @click="triggerFileInput"
                  :disabled="
                    isReplacingFile ||
                    !mediaItem?.mime_type.startsWith('image/')
                  "
                  class="w-full"
                >
                  <div class="flex flex-row gap-4 items-center">
                    <AppIcon
                      :icon="isReplacingFile ? 'refresh' : 'swap_horiz'"
                      :class="[
                        'text-base',
                        isReplacingFile ? 'animate-spin' : '',
                      ]"
                    />
                    <span>{{
                      isReplacingFile
                        ? __('Replacing...', 'flexify-dashboard')
                        : __('Replace Image', 'flexify-dashboard')
                    }}</span>
                  </div>
                </AppButton>

                <AppButton
                  @click="editImage"
                  :disabled="!mediaItem?.mime_type.startsWith('image/')"
                  class="w-full"
                >
                  <div class="flex flex-row gap-4 items-center">
                    <AppIcon icon="crop" class="text-base" />
                    <span>{{ __('Edit Image', 'flexify-dashboard') }}</span>
                  </div>
                </AppButton>

                <AppButton @click="deleteMedia" class="w-full" type="danger">
                  <div class="flex flex-row gap-4 items-center">
                    <AppIcon icon="delete" />
                    <span>{{ __('Delete', 'flexify-dashboard') }}</span>
                  </div>
                </AppButton>
              </div>
            </div>

            <!-- Metadata -->
            <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3"
              >
                {{ __('Details', 'flexify-dashboard') }}
              </label>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-4 items-center">
                  <dt class="text-zinc-500 dark:text-zinc-400">
                    {{ __('Filename', 'flexify-dashboard') }}
                  </dt>
                  <dd
                    class="text-zinc-700 dark:text-zinc-300 font-mono text-xs text-right overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {{ mediaItem.media_details?.file || '—' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4 items-center">
                  <dt class="text-zinc-500 dark:text-zinc-400">
                    {{ __('ID', 'flexify-dashboard') }}
                  </dt>
                  <dd
                    class="text-zinc-700 dark:text-zinc-300 font-mono text-xs text-right overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {{ mediaItem.id }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4 items-center">
                  <dt class="text-zinc-500 dark:text-zinc-400">
                    {{ __('Modified', 'flexify-dashboard') }}
                  </dt>
                  <dd
                    class="text-zinc-700 dark:text-zinc-300 text-xs text-right overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {{ formatDate(mediaItem.modified) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4 items-center">
                  <dt class="text-zinc-500 dark:text-zinc-400">
                    {{ __('File size', 'flexify-dashboard') }}
                  </dt>
                  <dd
                    class="text-zinc-700 dark:text-zinc-300 text-xs text-right overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {{ formatFileSize(mediaItem.media_details?.filesize) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Media Usage -->
            <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-3"
              >
                {{ __('Used In', 'flexify-dashboard') }}
              </label>

              <div
                v-if="isLoadingUsage"
                class="flex items-center justify-center py-4"
              >
                <AppIcon
                  icon="refresh"
                  class="text-lg animate-spin text-zinc-400"
                />
              </div>

              <div
                v-else-if="mediaUsage.length === 0"
                class="text-sm text-zinc-500 dark:text-zinc-400 py-2"
              >
                {{
                  __('This media is not currently used anywhere.', 'flexify-dashboard')
                }}
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="usage in mediaUsage"
                  :key="usage.id"
                  class="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <AppIcon
                        :icon="
                          usage.type === 'post'
                            ? 'article'
                            : usage.type === 'page'
                            ? 'description'
                            : 'widgets'
                        "
                        class="text-sm text-zinc-400 dark:text-zinc-500 flex-shrink-0"
                      />
                      <span
                        class="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate"
                      >
                        {{ usage.title }}
                      </span>
                    </div>
                    <div
                      class="text-xs text-zinc-500 dark:text-zinc-400 truncate ml-6"
                    >
                      {{
                        usage.type === 'post'
                          ? __('Post', 'flexify-dashboard')
                          : usage.type === 'page'
                          ? __('Page', 'flexify-dashboard')
                          : __('Widget', 'flexify-dashboard')
                      }}
                      <span v-if="usage.status" class="ml-2">
                        •
                        {{
                          usage.status === 'publish'
                            ? __('Published', 'flexify-dashboard')
                            : __('Draft', 'flexify-dashboard')
                        }}
                      </span>
                    </div>
                  </div>
                  <a
                    v-if="usage.edit_url"
                    :href="usage.edit_url"
                    target="_blank"
                    class="ml-2 p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                    :title="__('Edit', 'flexify-dashboard')"
                  >
                    <AppIcon
                      icon="open_in_new"
                      class="text-sm text-zinc-500 dark:text-zinc-400"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <Confirm ref="userConfirm" />

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      @change="handleFileInput"
      accept="image/*,video/*,audio/*,.pdf"
      class="hidden"
    />
  </div>
</template>
