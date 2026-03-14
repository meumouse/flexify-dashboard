<script setup>
import {
  ref,
  computed,
  inject,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppCheckbox from '@/components/utility/media-library/src/checkbox.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const selectionMode = inject('selectionMode', null);
const isSelectionMode = computed(() => selectionMode?.isActive?.value === true);

// Props
const props = defineProps({
  media: {
    type: Array,
    default: () => [],
  },
  selectedMedia: {
    type: Array,
    default: () => [],
  },
  viewMode: {
    type: String,
    default: 'list', // 'list' or 'grid'
  },
  hasMore: {
    type: Boolean,
    default: false,
  },
  loadingMore: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits([
  'selectMedia',
  'delete',
  'toggleSelection',
  'loadMore',
]);

// Refs for scroll detection
const scrollContainer = ref(null);
const sentinel = ref(null);

// Local refs
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuItem = ref(null);

/**
 * Handle media item click (for details view)
 */
const handleMediaClick = (item, event) => {
  // Don't navigate if clicking on checkbox
  if (event.target.closest('.media-checkbox')) {
    return;
  }

  // In selection mode, clicking the card toggles selection instead of navigating
  if (isSelectionMode.value) {
    event.preventDefault();
    emit('toggleSelection', item, event);
    return;
  }

  emit('selectMedia', item);
};

/**
 * Handle checkbox toggle
 */
const handleCheckboxToggle = (item, event) => {
  event.stopPropagation();
  emit('toggleSelection', item, event);
};

/**
 * Check if media item is selected
 */
const isSelected = (item) => {
  return props.selectedMedia.includes(item.id);
};

/**
 * Handle context menu
 */
const showItemContextMenu = (event, item) => {
  event.preventDefault();
  contextMenuItem.value = item;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

/**
 * Hide context menu
 */
const hideContextMenu = () => {
  showContextMenu.value = false;
  contextMenuItem.value = null;
};

/**
 * Handle delete item
 */
const handleDeleteItem = (item) => {
  emit('delete', [item.id]);
  hideContextMenu();
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (!bytes) return __('Unknown', 'flexify-dashboard');

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
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
  if (mimeType.includes('word')) return 'description';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return 'table_chart';
  if (mimeType.includes('zip') || mimeType.includes('archive'))
    return 'archive';
  return 'insert_drive_file';
};

// Intersection Observer for infinite scroll
let observer = null;

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  if (typeof IntersectionObserver !== 'undefined' && sentinel.value) {
    // Find the scrollable parent container
    let scrollRoot = null;
    if (scrollContainer.value) {
      let parent = scrollContainer.value.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          parent.classList.contains('custom-scrollbar') ||
          parent.classList.contains('overflow-auto')
        ) {
          scrollRoot = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && props.hasMore && !props.loadingMore) {
          emit('loadMore');
        }
      },
      {
        root: scrollRoot,
        rootMargin: '200px', // Start loading 200px before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(sentinel.value);
  }
};

onMounted(async () => {
  // Wait for DOM to be ready
  await nextTick();
  setupObserver();
});

// Watch for sentinel element changes (e.g., when view mode changes)
watch(
  () => sentinel.value,
  () => {
    if (sentinel.value) {
      nextTick(() => {
        setupObserver();
      });
    }
  }
);

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

// Close context menu when clicking outside
document.addEventListener('click', hideContextMenu);
</script>

<template>
  <div class="relative" ref="scrollContainer">
    <!-- Grid View -->
    <div
      v-if="viewMode === 'grid'"
      class="py-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-3"
    >
      <RouterLink
        v-for="item in media"
        :key="item.id"
        :to="`/details/${item.id}`"
        @click="handleMediaClick(item, $event)"
        @contextmenu="showItemContextMenu($event, item)"
        class="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
        :class="
          route.params.mediaId == item.id
            ? 'ring-2 ring-zinc-900 dark:ring-zinc-100'
            : ''
        "
      >
        <!-- Checkbox -->
        <div
          class="absolute top-2 left-2 z-10 transition-opacity duration-200 media-checkbox cursor-pointer"
          :class="
            isSelected(item)
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          "
          @click.stop="handleCheckboxToggle(item, $event)"
        >
          <AppCheckbox :isactive="isSelected(item)" />
        </div>

        <!-- Thumbnail -->
        <div
          class="w-full h-full flex items-center justify-center overflow-hidden"
        >
          <img
            v-if="item.mime_type.startsWith('image/') && item.thumbnail"
            :src="item.thumbnail"
            :alt="item.alt || item.title"
            class="w-full h-full object-cover"
            :class="item.url.includes('.svg') ? 'invert dark:invert-0' : ''"
          />

          <div
            v-else
            class="w-full h-full flex flex-col items-center justify-center p-4"
          >
            <AppIcon
              :icon="getFileTypeIcon(item.mime_type)"
              class="text-3xl text-zinc-400 dark:text-zinc-500 mb-2"
            />
            <span
              class="text-xs text-zinc-500 dark:text-zinc-400 text-center truncate w-full"
            >
              {{ item.filename }}
            </span>
          </div>
        </div>

        <!-- Overlay Info -->
        <div
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div
            class="text-white text-xs font-medium truncate mb-1"
            :title="item.title || item.filename"
          >
            {{ item.title || item.filename }}
          </div>
          <div class="text-white/70 text-[10px] truncate">
            {{ formatFileSize(item.file_size) }}
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- List View -->
    <div v-else class="py-2 flex flex-col gap-1">
      <RouterLink
        v-for="item in media"
        :key="item.id"
        :to="`/details/${item.id}`"
        @click="handleMediaClick(item, $event)"
        @contextmenu="showItemContextMenu($event, item)"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all group -mx-3 relative"
        :class="
          route.params.mediaId == item.id
            ? 'bg-zinc-100 dark:bg-zinc-800/60'
            : ''
        "
      >
        <!-- Media Thumbnail -->
        <div class="flex-shrink-0 relative">
          <!-- Checkbox - shows on hover, positioned centered over thumbnail -->
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 media-checkbox cursor-pointer"
            :class="
              isSelected(item)
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            "
            @click.stop="handleCheckboxToggle(item, $event)"
          >
            <AppCheckbox :isactive="isSelected(item)" />
          </div>

          <div
            class="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden"
          >
            <img
              v-if="item.mime_type.startsWith('image/') && item.thumbnail"
              :src="item.thumbnail"
              :alt="item.alt || item.title"
              class="w-full h-full object-cover"
              :class="item.url.includes('.svg') ? 'invert dark:invert-0' : ''"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <AppIcon
                :icon="getFileTypeIcon(item.mime_type)"
                class="text-zinc-500 dark:text-zinc-400"
              />
            </div>
          </div>
        </div>

        <!-- Media Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate"
              :title="item.title || item.filename"
              :class="
                route.params.mediaId == item.id
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              "
            >
              {{ item.title || item.filename }}
            </span>
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {{ formatFileSize(item.file_size) }} •
            {{ formatDate(item.date_created) }} •
            {{ item.author }}
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Infinite Scroll Sentinel & Loading Indicator -->
    <div ref="sentinel" class="w-full py-4 flex items-center justify-center">
      <div
        v-if="loadingMore"
        class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400"
      >
        <div
          class="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"
        ></div>
        <span class="text-xs">{{ __('Loading more...', 'flexify-dashboard') }}</span>
      </div>
      <div
        v-else-if="!hasMore && media.length > 0"
        class="text-xs text-zinc-400 dark:text-zinc-500"
      >
        {{ __('No more items', 'flexify-dashboard') }}
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="showContextMenu && contextMenuItem"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
      class="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-32"
      @click.stop
    >
      <button
        @click="handleDeleteItem(contextMenuItem)"
        class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
      >
        <AppIcon icon="delete" class="text-sm" />
        {{ __('Delete', 'flexify-dashboard') }}
      </button>
    </div>
  </div>
</template>
