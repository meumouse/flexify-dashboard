<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import ImageEditor from '@/components/utility/image-editor/index.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const mediaItem = ref(null);
const isSaving = ref(false);

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

  // Only allow editing for images
  if (!mediaItem.value.mime_type.startsWith('image/')) {
    notify({
      title: __('Only images can be edited', 'flexify-dashboard'),
      type: 'error',
    });
    router.push({
      name: 'media-details',
      params: { mediaId: route.params.mediaId },
    });
    return;
  }
};

/**
 * Handle save from image editor
 */
const handleSave = async (dataUrl) => {
  if (!dataUrl) return;

  isSaving.value = true;

  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create a file from the blob
    const editedFile = new File(
      [blob],
      mediaItem.value.media_details?.file || 'edited-image.jpg',
      {
        type: 'image/jpeg',
      }
    );

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', editedFile);
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
        title: __('Image saved successfully', 'flexify-dashboard'),
        type: 'success',
      });

      // Navigate back to details view
      router.push({
        name: 'media-details',
        params: { mediaId: route.params.mediaId },
      });
    }
  } catch (error) {
    console.error('Save error:', error);
    notify({
      title: __('Failed to save image', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isSaving.value = false;
  }
};

/**
 * Handle cancel from image editor
 */
const handleCancel = () => {
  router.push({
    name: 'media-details',
    params: { mediaId: route.params.mediaId },
  });
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

// Lifecycle
onMounted(async () => {
  await getMediaItem();
});
</script>

<template>
  <div class="flex-1 flex h-full max-h-full overflow-hidden bg-white dark:bg-zinc-950">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3"
        >
          <AppIcon icon="image" class="text-xl text-zinc-400 animate-pulse" />
        </div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ __('Loading...', 'flexify-dashboard') }}</p>
      </div>
    </div>

    <!-- Editor Interface -->
    <div v-else-if="mediaItem" class="flex-1 flex flex-col h-full">
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      >
        <div class="flex items-center gap-4">
          <button
            @click="handleCancel"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <AppIcon icon="arrow_back" class="text-base" />
            <span class="text-sm">{{ __('Back', 'flexify-dashboard') }}</span>
          </button>

          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                {{ mediaItem.media_details?.file || 'image.jpg' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Image Info -->
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            <span
              v-if="
                mediaItem.media_details?.width &&
                mediaItem.media_details?.height
              "
            >
              {{ mediaItem.media_details.width }} ×
              {{ mediaItem.media_details.height }}
            </span>
            <span class="mx-2">•</span>
            <span>{{ formatFileSize(mediaItem.media_details?.filesize) }}</span>
          </div>
        </div>
      </div>

      <!-- Editor Container -->
      <div class="flex-1 overflow-hidden">
        <ImageEditor
          v-if="mediaItem.source_url"
          :src="mediaItem.source_url"
          @save="handleSave"
          @cancel="handleCancel"
        />
      </div>
    </div>
  </div>
</template>
