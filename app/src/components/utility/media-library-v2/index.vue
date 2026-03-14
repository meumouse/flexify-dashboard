<script setup>
import {
  ref,
  computed,
  provide,
  watch,
  nextTick,
  createApp,
  h,
  onBeforeUnmount,
} from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { createPinia } from 'pinia';
import { useDarkMode } from '@/pages/media/src/useDarkMode.js';
import MediaListView from '@/pages/media/src/media-list-view.vue';
import MediaDetailsView from '@/pages/media/src/media-details-view.vue';
import MediaEditView from '@/pages/media/src/media-edit-view.vue';
import { setVueGlobalProperties } from '@/setup/setGlobalProperties.js';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import Notifications from '@/components/utility/notifications/index.vue';

// Components
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import { boolean } from 'zod';

const { isDark } = useDarkMode();

import '@/apps/css/media.css';

// Props
const props = defineProps({
  // Filter by media type: 'image', 'video', 'audio', 'document', 'font', or null for all
  imageTypes: {
    type: String,
    default: null,
    validator: (value) =>
      value === null ||
      ['image', 'video', 'audio', 'document', 'font'].includes(value),
  },
  // Allow multiple selection
  multiple: {
    type: Boolean,
    default: false,
  },
  // Pre-selected media IDs
  chosen: {
    type: Array,
    default: () => [],
  },
  shouldTeleport: {
    type: boolean,
    default: false,
  },
});

// Refs
const open = ref(false);
const resolvePromise = ref(null);
const rejectPromise = ref(null);
const selectedMediaIds = ref([]);
const selectedMediaItems = ref([]); // Store full media objects
const isSelectionMode = ref(false);
const selectionMultiple = ref(props.multiple);
const selectionImageTypes = ref(props.imageTypes);
const mediaAppContainer = ref(null);
const mediaAppInstance = ref(null);
const mediaRouter = ref(null);

// Computed
const hasSelection = computed(() => selectedMediaIds.value.length > 0);

// Selection mode context shared with the embedded media app
const selectionContext = {
  isActive: computed(() => isSelectionMode.value),
  selectedMediaIds,
  selectedMediaItems,
  multiple: computed(() => selectionMultiple.value),
  imageTypes: computed(() => selectionImageTypes.value),
  onSelect: (mediaIds, mediaItems) => {
    if (!selectionMultiple.value && mediaIds.length > 0) {
      selectedMediaIds.value = [mediaIds[0]];
      selectedMediaItems.value = mediaItems ? [mediaItems[0]] : [];
    } else {
      selectedMediaIds.value = mediaIds;
      selectedMediaItems.value = mediaItems || [];
    }
  },
};

// Also provide to the host component tree (not used by the media app, but kept for consistency)
provide('selectionMode', selectionContext);

/**
 * Create media app instance
 */
const createMediaApp = async () => {
  // If container exists but app doesn't, clean up first
  if (
    mediaAppInstance.value &&
    !mediaAppContainer.value?.contains(mediaAppInstance.value.container)
  ) {
    destroyMediaApp();
  }

  if (mediaAppInstance.value) {
    // App already exists, just ensure it's in the right place
    if (
      mediaAppContainer.value &&
      !mediaAppContainer.value.contains(mediaAppInstance.value.container)
    ) {
      mediaAppContainer.value.appendChild(mediaAppInstance.value.container);
    }
    return;
  }

  // Ensure container ref is available
  if (!mediaAppContainer.value) {
    await nextTick();
    if (!mediaAppContainer.value) {
      console.error('Media app container not available');
      return;
    }
  }

  const container = document.createElement('div');
  container.className =
    'h-full w-full overflow-hidden flexify-dashboard-normalize font-sans';
  mediaAppContainer.value.appendChild(container);

  // Create router with nested routes (MediaListView has its own RouterView for details)
  const routes = [
    {
      path: '/',
      component: MediaListView,
      name: 'media-library',
      meta: { name: __('Media Library', 'flexify-dashboard') },
      children: [
        {
          path: '/details/:mediaId',
          component: MediaDetailsView,
          name: 'media-details',
          meta: { name: __('Media Details', 'flexify-dashboard') },
        },
        {
          path: '/edit/:mediaId',
          component: MediaEditView,
          name: 'media-edit',
          meta: { name: __('Edit Image', 'flexify-dashboard') },
        },
      ],
    },
  ];

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  // Create app with router view wrapper
  const app = createApp({
    setup() {
      return () =>
        h('div', { class: 'h-full w-full' }, [h(Notifications), h(RouterView)]);
    },
  });

  // Provide selection context to the media app so injected components can access it
  app.provide('selectionMode', selectionContext);

  const pinia = createPinia();
  app.use(pinia);
  app.use(router);

  // Set global properties
  setVueGlobalProperties(app);

  mediaRouter.value = router;

  // Mount app
  app.mount(container);
  mediaAppInstance.value = { app, container, router };

  // Listen for selection event from MediaListView
  const handleMediaSelect = (event) => {
    const { ids, items } = event.detail;
    selectedMediaIds.value = ids;
    selectedMediaItems.value = items;
    confirmSelection();
  };

  window.addEventListener('flexify-dashboard-media-select', handleMediaSelect);

  // Store handler for cleanup
  mediaAppInstance.value.selectHandler = handleMediaSelect;

  // Ensure router is ready and navigate to root
  router.isReady().then(() => {
    router.push('/');
  });
};

/**
 * Destroy media app instance
 */
const destroyMediaApp = () => {
  if (mediaAppInstance.value) {
    // Remove event listener
    if (mediaAppInstance.value.selectHandler) {
      window.removeEventListener(
        'flexify-dashboard-media-select',
        mediaAppInstance.value.selectHandler
      );
    }

    mediaAppInstance.value.app.unmount();
    if (mediaAppInstance.value.container.parentNode) {
      mediaAppInstance.value.container.parentNode.removeChild(
        mediaAppInstance.value.container
      );
    }
    mediaAppInstance.value = null;
    mediaRouter.value = null;
  }
};

/**
 * Open the media library modal
 */
const select = async (options = {}) => {
  // Merge options with props
  const mergedOptions = {
    imageTypes: options.imageTypes ?? props.imageTypes,
    multiple: options.multiple ?? props.multiple,
    chosen: options.chosen ?? props.chosen ?? [],
  };

  // Persist merged options for selection context
  selectionMultiple.value = mergedOptions.multiple;
  selectionImageTypes.value = mergedOptions.imageTypes;

  // Set initial selected media from chosen prop
  selectedMediaIds.value = Array.isArray(mergedOptions.chosen)
    ? [...mergedOptions.chosen]
    : [];
  selectedMediaItems.value = []; // Will be populated from MediaListView

  // Reset state
  isSelectionMode.value = true;

  // Open modal first so container is available
  open.value = true;

  // Wait for DOM to update
  await nextTick();

  // Create media app if needed
  await createMediaApp();

  // Ensure router navigates to home after app is created
  await nextTick();
  if (mediaRouter.value) {
    await mediaRouter.value.isReady();
    mediaRouter.value.push('/');
  }

  // Return promise
  return new Promise((resolve, reject) => {
    resolvePromise.value = resolve;
    rejectPromise.value = reject;
  });
};

/**
 * Confirm selection and return selected items
 */
const confirmSelection = async () => {
  if (!hasSelection.value) return;

  // If we have full media items, use them
  if (selectedMediaItems.value.length > 0) {
    resolvePromise.value(selectedMediaItems.value);
  } else {
    // Otherwise, fetch full media data from IDs
    const mediaPromises = selectedMediaIds.value.map(async (id) => {
      const response = await lmnFetch({
        endpoint: `wp/v2/media/${id}`,
        params: { context: 'edit' },
      });
      if (response?.data) {
        return {
          id: response.data.id,
          title: response.data.title,
          source_url: response.data.source_url,
          mime_type: response.data.mime_type,
          alt_text: response.data.alt_text || '',
          caption: response.data.caption || { raw: '', rendered: '' },
          description: response.data.description || { raw: '', rendered: '' },
        };
      }
      return null;
    });

    const mediaItems = (await Promise.all(mediaPromises)).filter(Boolean);
    resolvePromise.value(mediaItems);
  }

  // Reset state
  selectedMediaIds.value = [];
  selectedMediaItems.value = [];
  isSelectionMode.value = false;
  open.value = false;
};

/**
 * Cancel selection
 */
const cancelSelection = () => {
  resolvePromise.value(false);
  selectedMediaIds.value = [];
  selectedMediaItems.value = [];
  isSelectionMode.value = false;
  open.value = false;
};

/**
 * Handle click outside modal
 */
const maybeClose = (evt) => {
  // Only close if clicking the backdrop, not the content
  if (evt.target === evt.currentTarget) {
    cancelSelection();
  }
};

/**
 * Disable load-styles.php stylesheet
 */
const disableLoadStyles = () => {
  const linkElement = document.querySelector('link[href*="load-styles.php"]');
  if (linkElement) {
    linkElement.setAttribute('rel', 'disabled');
  }
};

/**
 * Enable load-styles.php stylesheet
 */
const enableLoadStyles = () => {
  const linkElement = document.querySelector('link[href*="load-styles.php"]');
  if (linkElement) {
    linkElement.setAttribute('rel', 'stylesheet');
  }
};

/**
 * Handle escape key press to close media selector
 */
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && open.value) {
    cancelSelection();
  }
};

// Watch for open changes to clean up
watch(open, (isOpen) => {
  if (isOpen) {
    disableLoadStyles();
    // Add escape key listener when opening
    window.addEventListener('keydown', handleEscapeKey);
  } else {
    enableLoadStyles();
    // Remove escape key listener when closing
    window.removeEventListener('keydown', handleEscapeKey);
  }

  if (!isOpen && mediaAppInstance.value) {
    // Don't destroy, just hide - keep instance for reuse
    // destroyMediaApp();
  }
});

// Clean up event listener on component unmount
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey);
  enableLoadStyles();
});

// Expose select method
defineExpose({
  select,
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div class="flexify-dashboard-isolation" v-if="open">
        <div
          class="fixed top-0 left-0 right-0 bottom-0 h-dvh max-h-dvh max-w-dvw bg-zinc-900/40 flex flex-row z-[99999] items-stretch flexify-dashboard-normalize"
          @click="maybeClose"
          :class="isDark ? 'dark' : ''"
        >
          <div
            class="w-full h-full bg-white dark:bg-zinc-900 flex flex-col overflow-hidden p-6"
            @click.stop
          >
            <!-- Header -->
            <div
              class="flex flex-row items-center place-content-between flex-shrink-0"
            >
              <div class="absolute top-8 right-8">
                <AppButton
                  v-if="isSelectionMode"
                  type="default"
                  @click="cancelSelection"
                >
                  <AppIcon icon="close" />
                </AppButton>
                <AppButton v-else type="transparent" @click="cancelSelection">
                  <AppIcon icon="close" />
                </AppButton>
              </div>
            </div>

            <!-- Content Area - Media app will be mounted here -->
            <div class="flex-1 overflow-hidden" ref="mediaAppContainer"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
