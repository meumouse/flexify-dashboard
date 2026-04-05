<script setup>
import {
  ref,
  watch,
  nextTick,
  computed,
  watchEffect,
  onMounted,
  onUnmounted,
  inject,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ShadowRoot } from 'vue-shadow-dom';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Inject selection mode context (if available)
const selectionMode = inject('selectionMode', null);

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';
import { useDarkMode } from './useDarkMode.js';
import Drawer from '@/components/utility/drawer/index.vue';
const { isDark } = useDarkMode();

// Comps
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import MediaList from './media-list.vue';
import Confirm from '@/components/utility/confirm/index.vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppTextArea from '@/components/utility/text-area/index.vue';

const router = useRouter();
const route = useRoute();

// Refs
const loading = ref(false);
const mediaItems = ref([]);
const filteredMedia = ref([]);
const sortBy = ref('date'); // 'date', 'name', 'size', 'type'
const sortOrder = ref('desc'); // 'asc' or 'desc'
const searchQuery = ref('');
const selectionImageType = computed(
  () => selectionMode?.imageTypes?.value || null
);
const selectedType = ref(
  selectionImageType.value ? selectionImageType.value : 'all'
); // 'all', 'image', 'video', 'audio', 'document', 'font'

// Font MIME types for filtering
const fontMimeTypes = [
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'application/font-woff2',
  'application/font-woff',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/vnd.ms-fontobject',
];

/**
 * Check if a MIME type is a font file
 */
const isFontMimeType = (mimeType) => {
  return (
    fontMimeTypes.includes(mimeType) ||
    mimeType.startsWith('font/') ||
    mimeType.includes('font')
  );
};
const showUnusedOnly = ref(false);
const dateFilter = ref('all'); // 'all', 'today', 'week', 'month', 'year'
const filtersExpanded = ref(false);
const selectedTags = ref([]); // Array of tag IDs
const allTags = ref([]);
const showTagFilter = ref(false);
const uploadDialog = ref(false);
const uploadInput = ref(null);
const isUploading = ref(false);
const dragOver = ref(false);
const dragCounter = ref(0);
const uploadProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  currentFileName: '',
});
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
const drawerOpen = ref(false);
const selectedMedia = ref([]); // Array of selected media IDs
const lastSelectedIndex = ref(null); // Index of last selected media item for range selection
const isDuplicating = ref(false); // Loading state for batch duplicate
const confirmDialog = ref(null); // Ref for confirm component
const viewMode = ref('list'); // 'list' or 'grid'
const bulkEditDrawerOpen = ref(false); // Bulk edit drawer state
const isDownloading = ref(false); // Bulk download loading state
const isBulkEditing = ref(false); // Bulk edit saving state
const bulkEditForm = ref({
  title: '',
  alt_text: '',
  caption: '',
  description: '',
});
const pagination = ref({
  page: 1,
  per_page: 30,
  total: 0,
  totalPages: 0,
  search: '',
  order: 'desc',
  orderby: 'date',
});

const loadingMore = ref(false); // Loading state for infinite scroll

// Computed property for window width
const windowWidthComputed = computed(() => windowWidth.value);

// Allowed file types for upload input
const allowedFileTypes = computed(() => {
  // Base types: images, videos, audio, documents
  const baseTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'];

  // Font types
  const fontTypes = [
    '.woff2',
    '.woff',
    '.ttf',
    '.otf',
    '.eot',
    'font/woff2',
    'font/woff',
    'font/ttf',
    'font/otf',
    'application/font-woff2',
    'application/font-woff',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/vnd.ms-fontobject',
  ];

  // SVG (if enabled via WordPress)
  const svgTypes = ['.svg', 'image/svg+xml'];

  return [...baseTypes, ...fontTypes, ...svgTypes].join(',');
});

// Infinite scroll helpers
const hasMore = computed(() => {
  return (
    pagination.value.totalPages > 0 &&
    pagination.value.page < pagination.value.totalPages
  );
});

// Active filter count
const activeFiltersCount = computed(() => {
  let count = 0;
  if (selectedType.value !== 'all') count++;
  if (showUnusedOnly.value) count++;
  if (dateFilter.value !== 'all') count++;
  if (selectedTags.value.length > 0) count++;
  return count;
});

/**
 * Fetches media data from WordPress REST API
 * @param {boolean} append - If true, append to existing items. If false, replace items.
 */
const getMediaData = async (append = false) => {
  // Don't show main loading if appending (infinite scroll)
  if (!append) {
    loading.value = true;
    appStore.updateState('loading', true);
  } else {
    loadingMore.value = true;
  }

  const args = {
    endpoint: 'wp/v2/media',
    params: {
      page: pagination.value.page,
      per_page: pagination.value.per_page,
      search: pagination.value.search,
      order: pagination.value.order,
      orderby: pagination.value.orderby,
      context: 'edit',
      unused: showUnusedOnly.value,
      unused_mode: 'deep',
    },
  };

  // Add tag filtering if tags are selected
  // WordPress REST API expects array parameters as multiple query params: tag_ids[]=1&tag_ids[]=2
  if (selectedTags.value.length > 0) {
    args.params.tag_ids = selectedTags.value;
  }

  const data = await lmnFetch(args);

  loading.value = false;
  loadingMore.value = false;
  appStore.updateState('loading', false);

  if (!data) return;

  // Transform the data to match our expected format
  const newItems = data.data.map((item) => ({
    id: item.id,
    title: item.title?.rendered || item.slug,
    filename: item.media_details?.file || item.slug,
    url: item.source_url,
    alt: item.alt_text || '',
    mime_type: item.mime_type,
    file_size: item.media_details?.filesize || 0,
    width: item.media_details?.width || null,
    height: item.media_details?.height || null,
    date_created: item.date,
    date_modified: item.modified,
    author: item.author_name || '',
    thumbnail:
      item.media_details?.sizes?.thumbnail?.source_url || item.source_url,
    medium: item.media_details?.sizes?.medium?.source_url || item.source_url,
    large: item.media_details?.sizes?.large?.source_url || item.source_url,
    full: item.source_url,
  }));

  // Append or replace items based on the append parameter
  if (append) {
    // Filter out duplicates (in case of race conditions)
    const existingIds = new Set(mediaItems.value.map((item) => item.id));
    const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
    mediaItems.value.push(...uniqueNewItems);
  } else {
    mediaItems.value = newItems;
  }

  pagination.value.total = data.totalItems;
  pagination.value.totalPages = data.totalPages;

  applyFilters();
};

/**
 * Load more items for infinite scroll
 */
const loadMore = async () => {
  if (!hasMore.value || loadingMore.value || loading.value) return;

  pagination.value.page += 1;
  await getMediaData(true);
};

/**
 * Handle media item selection - navigate to details
 */
const selectMediaItem = (item) => {
  router.push({ name: 'media-details', params: { mediaId: item.id } });
};

/**
 * Handle media checkbox selection
 */
const toggleMediaSelection = (item, event) => {
  const currentIndex = filteredMedia.value.findIndex(
    (media) => media.id === item.id
  );

  // Check if we're in single selection mode
  const isSingleSelectionMode =
    selectionMode?.isActive?.value && !selectionMode?.multiple?.value;

  // Handle shift+click for range selection (only if multiple selection is allowed)
  if (
    event?.shiftKey &&
    lastSelectedIndex.value !== null &&
    !isSingleSelectionMode
  ) {
    const start = Math.min(lastSelectedIndex.value, currentIndex);
    const end = Math.max(lastSelectedIndex.value, currentIndex);

    // Get all items in the range
    const rangeItems = filteredMedia.value.slice(start, end + 1);
    const rangeIds = rangeItems.map((media) => media.id);

    // Add all items in range to selection (avoid duplicates)
    rangeIds.forEach((id) => {
      if (!selectedMedia.value.includes(id)) {
        selectedMedia.value.push(id);
      }
    });

    // Update last selected index
    lastSelectedIndex.value = currentIndex;
  } else {
    // Normal toggle behavior
    const index = selectedMedia.value.findIndex((id) => id === item.id);
    if (index > -1) {
      selectedMedia.value.splice(index, 1);
    } else {
      // In single selection mode, clear previous selection before adding new one
      if (isSingleSelectionMode) {
        selectedMedia.value = [];
      }
      selectedMedia.value.push(item.id);
    }

    // Update last selected index
    lastSelectedIndex.value = currentIndex;
  }

  // Sync with selection mode context if available
  if (selectionMode?.onSelect) {
    const selectedItems = filteredMedia.value.filter((media) =>
      selectedMedia.value.includes(media.id)
    );
    selectionMode.onSelect(selectedMedia.value, selectedItems);
  }
};

/**
 * Check if media item is selected
 */
const isMediaSelected = (item) => {
  return selectedMedia.value.includes(item.id);
};

/**
 * Computed property to check if there are selected items
 */
const hasSelection = computed(() => {
  return selectedMedia.value.length > 0;
});

/**
 * Get selected count text
 */
const selectedCountText = computed(() => {
  const count = selectedMedia.value.length;
  return count === 1
    ? __('1 item selected', 'flexify-dashboard')
    : __('%d items selected', 'flexify-dashboard').replace('%d', count);
});

/**
 * Check if we're in selection mode (used as media selector)
 */
const isInSelectionMode = computed(() => {
  return selectionMode?.isActive?.value === true;
});

/**
 * Handle select button click in selection mode
 */
const handleSelectInSelectionMode = () => {
  if (selectedMedia.value.length === 0) return;

  // Get full media items for selected IDs
  const selectedItems = filteredMedia.value.filter((media) =>
    selectedMedia.value.includes(media.id)
  );

  // Dispatch custom event to notify wrapper
  const event = new CustomEvent('flexify-dashboard-media-select', {
    detail: {
      ids: [...selectedMedia.value],
      items: selectedItems.map((item) => ({
        id: item.id,
        title: item.title,
        source_url: item.url,
        mime_type: item.mime_type,
        alt_text: item.alt || '',
        caption: { raw: '', rendered: '' },
        description: { raw: '', rendered: '' },
      })),
    },
  });
  window.dispatchEvent(event);
};

/**
 * View first selected media item
 */
const viewSelectedMedia = () => {
  if (selectedMedia.value.length === 0) return;
  const firstSelectedId = selectedMedia.value[0];
  router.push({ name: 'media-details', params: { mediaId: firstSelectedId } });
};

/**
 * Get file extension from filename or URL
 */
const getFileExtension = (filename, sourceUrl) => {
  // Try filename first (most reliable)
  if (filename && filename.includes('.')) {
    const ext = filename.split('.').pop().toLowerCase();
    // Remove query parameters if any
    return ext.split('?')[0].split('#')[0];
  }

  // Fallback to source URL
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const pathname = url.pathname;
      const ext = pathname.split('.').pop().toLowerCase();
      return ext.split('?')[0].split('#')[0];
    } catch (e) {
      // If URL parsing fails, try simple split
      const ext = sourceUrl.split('.').pop().toLowerCase();
      return ext.split('?')[0].split('#')[0];
    }
  }

  return '';
};

/**
 * Batch duplicate selected media items
 */
const batchDuplicateMedia = async () => {
  if (selectedMedia.value.length === 0) return;

  isDuplicating.value = true;

  try {
    for (const mediaId of selectedMedia.value) {
      // Fetch full media item data with edit context to get accurate info
      const fullMediaResponse = await lmnFetch({
        endpoint: `wp/v2/media/${mediaId}`,
        params: { context: 'edit' },
        type: 'GET',
      });

      if (!fullMediaResponse || !fullMediaResponse.data) {
        console.warn('Failed to fetch media item data:', mediaId);
        continue;
      }

      const mediaItem = fullMediaResponse.data;

      // Get MIME type from media item (WordPress validated this)
      const mimeType = mediaItem.mime_type;
      if (!mimeType) {
        console.warn('No MIME type found for media item:', mediaId);
        continue;
      }

      // Get source URL - use the original source_url
      const sourceUrl =
        mediaItem.source_url ||
        mediaItem.media_details?.sizes?.full?.source_url;
      if (!sourceUrl) {
        console.warn('No source URL found for media item:', mediaId);
        continue;
      }

      // Get file extension properly from filename or source URL
      const fileExtension = getFileExtension(
        mediaItem.media_details?.file || mediaItem.source_url,
        sourceUrl
      );
      if (!fileExtension) {
        console.warn('No file extension found for media item:', mediaId);
        continue;
      }

      // Get base filename - use media_details filename if available, otherwise extract from source_url
      let baseFileName = 'file';
      if (mediaItem.media_details?.file) {
        // Extract filename without path
        const filePath = mediaItem.media_details.file;
        baseFileName = filePath
          .split('/')
          .pop()
          .replace(/\.[^/.]+$/, '');
      } else if (mediaItem.source_url) {
        try {
          const url = new URL(mediaItem.source_url);
          const pathname = url.pathname;
          baseFileName = pathname
            .split('/')
            .pop()
            .replace(/\.[^/.]+$/, '');
        } catch (e) {
          baseFileName = (
            mediaItem.title?.rendered ||
            mediaItem.title ||
            'file'
          ).replace(/\.[^/.]+$/, '');
        }
      } else {
        baseFileName = (
          mediaItem.title?.rendered ||
          mediaItem.title ||
          'file'
        ).replace(/\.[^/.]+$/, '');
      }

      const fileName = `${baseFileName} (copy).${fileExtension}`;

      // Fetch media file and create blob
      const mediaResponse = await fetch(sourceUrl);
      if (!mediaResponse.ok) {
        console.error('Failed to fetch media file:', sourceUrl);
        continue;
      }

      const mediaBlob = await mediaResponse.blob();

      // Create a File object with correct MIME type
      // WordPress validates that the MIME type matches the file extension
      const fileObject = new File([mediaBlob], fileName, { type: mimeType });

      const formData = new FormData();
      formData.append('file', fileObject);
      formData.append(
        'title',
        `${mediaItem.title?.rendered || mediaItem.title || baseFileName} (copy)`
      );
      if (mediaItem.alt_text) formData.append('alt_text', mediaItem.alt_text);
      if (mediaItem.caption?.rendered)
        formData.append('caption', mediaItem.caption.rendered);
      if (mediaItem.description?.rendered)
        formData.append('description', mediaItem.description.rendered);

      const args = {
        endpoint: `wp/v2/media`,
        params: {},
        type: 'POST',
        data: formData,
        isFormData: true,
      };

      const response = await lmnFetch(args);
      if (!response) {
        console.error('Failed to duplicate media item:', mediaId);
      }
    }

    // Refresh media list
    await getMediaData();

    // Clear selection
    selectedMedia.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('Files duplicated', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (error) {
    console.error('Error duplicating media:', error);
    notify({
      title: __('Error duplicating files', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isDuplicating.value = false;
  }
};

/**
 * Clear selection
 */
const clearSelection = () => {
  selectedMedia.value = [];
  lastSelectedIndex.value = null;

  // Sync with selection mode context if available
  if (selectionMode?.onSelect) {
    selectionMode.onSelect([], []);
  }
};

/**
 * Open bulk edit drawer
 */
const openBulkEdit = () => {
  bulkEditForm.value = {
    title: '',
    alt_text: '',
    caption: '',
    description: '',
  };
  bulkEditDrawerOpen.value = true;
};

/**
 * Save bulk edit changes
 */
const saveBulkEdit = async () => {
  if (selectedMedia.value.length === 0) return;

  isBulkEditing.value = true;

  try {
    const updatePromises = selectedMedia.value.map(async (mediaId) => {
      const updateData = {};

      // Only include fields that have been changed
      if (bulkEditForm.value.title.trim()) {
        updateData.title = bulkEditForm.value.title.trim();
      }
      if (bulkEditForm.value.alt_text.trim()) {
        updateData.alt_text = bulkEditForm.value.alt_text.trim();
      }
      if (bulkEditForm.value.caption.trim()) {
        updateData.caption = bulkEditForm.value.caption.trim();
      }
      if (bulkEditForm.value.description.trim()) {
        updateData.description = bulkEditForm.value.description.trim();
      }

      // Skip if no changes
      if (Object.keys(updateData).length === 0) return;

      await lmnFetch({
        endpoint: `wp/v2/media/${mediaId}`,
        type: 'POST',
        data: updateData,
      });
    });

    await Promise.all(updatePromises);

    // Refresh media list
    await getMediaData();

    // Close drawer and clear selection
    bulkEditDrawerOpen.value = false;
    selectedMedia.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('Media updated successfully', 'flexify-dashboard'),
      type: 'success',
    });
  } catch (error) {
    console.error('Bulk edit error:', error);
    notify({
      title: __('Error updating media', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isBulkEditing.value = false;
  }
};

/**
 * Bulk download selected media items
 */
const bulkDownload = async () => {
  if (selectedMedia.value.length === 0) return;

  isDownloading.value = true;

  try {
    // Create a backend endpoint to handle ZIP creation
    // For now, we'll download files individually and create ZIP client-side
    // Note: For large files, a backend endpoint would be better

    // Check if JSZip is available (we'll need to add it or use backend)
    // For now, let's create a simple backend endpoint approach

    const response = await lmnFetch({
      endpoint: 'flexify-dashboard/v1/media/bulk-download',
      type: 'POST',
      data: {
        media_ids: selectedMedia.value,
      },
    });

    if (response?.data?.download_url) {
      // Backend created ZIP, download it
      const link = document.createElement('a');
      link.href = response.data.download_url;
      link.download = `media-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify({
        title: __('Download started', 'flexify-dashboard'),
        type: 'success',
      });
    } else {
      // Fallback: download files individually
      for (const mediaId of selectedMedia.value) {
        const mediaItem = filteredMedia.value.find(
          (item) => item.id === mediaId
        );
        if (mediaItem?.source_url) {
          const link = document.createElement('a');
          link.href = mediaItem.source_url;
          link.download = mediaItem.filename || `media-${mediaId}`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      notify({
        title: __('Files downloaded', 'flexify-dashboard'),
        type: 'success',
      });
    }
  } catch (error) {
    console.error('Bulk download error:', error);
    notify({
      title: __('Error downloading files', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    isDownloading.value = false;
  }
};

/**
 * Handle batch delete with confirmation
 */
const handleBatchDelete = async () => {
  if (selectedMedia.value.length === 0) return;

  const count = selectedMedia.value.length;
  const countText =
    count === 1
      ? __('this file', 'flexify-dashboard')
      : __('these %d files', 'flexify-dashboard').replace('%d', count);

  // Confirm user intent
  const userResponse = await confirmDialog.value.show({
    title: __('Are you sure?', 'flexify-dashboard'),
    message: __(
      'Are you sure you want to delete %s? This action cannot be undone.',
      'flexify-dashboard'
    ).replace('%s', countText),
    okButton: __('Yes, delete', 'flexify-dashboard'),
  });

  // User cancelled
  if (!userResponse) return;

  // Proceed with deletion
  await handleDelete(selectedMedia.value);
};

/**
 * Handle media deletion
 */
const handleDelete = async (mediaIds) => {
  loading.value = true;

  try {
    const deletePromises = mediaIds.map((id) =>
      lmnFetch({
        endpoint: `wp/v2/media/${id}`,
        type: 'DELETE',
        params: {
          force: true,
        },
      })
    );

    await Promise.all(deletePromises);

    // Clear selection after deletion
    selectedMedia.value = [];
    lastSelectedIndex.value = null;

    notify({
      title: __('Media deleted successfully!', 'flexify-dashboard'),
      type: 'success',
    });

    // Refresh media data from API
    await getMediaData();
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
 * Apply filters and sorting to media items
 */
const applyFilters = () => {
  let filtered = [...mediaItems.value];

  // Filter by type
  if (selectedType.value !== 'all') {
    filtered = filtered.filter((item) => {
      if (selectedType.value === 'image')
        return item.mime_type.startsWith('image/');
      if (selectedType.value === 'video')
        return item.mime_type.startsWith('video/');
      if (selectedType.value === 'audio')
        return item.mime_type.startsWith('audio/');
      if (selectedType.value === 'font') return isFontMimeType(item.mime_type);
      if (selectedType.value === 'document')
        return (
          !item.mime_type.startsWith('image/') &&
          !item.mime_type.startsWith('video/') &&
          !item.mime_type.startsWith('audio/') &&
          !isFontMimeType(item.mime_type)
        );
      return true;
    });
  }

  // Filter by date
  if (dateFilter.value !== 'all') {
    const now = new Date();
    const itemDate = (item) => new Date(item.date_created);

    filtered = filtered.filter((item) => {
      const date = itemDate(item);
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      switch (dateFilter.value) {
        case 'today':
          return daysDiff === 0;
        case 'week':
          return daysDiff <= 7;
        case 'month':
          return daysDiff <= 30;
        case 'year':
          return daysDiff <= 365;
        default:
          return true;
      }
    });
  }

  // Filter by unused (placeholder - would need actual usage data from WP)
  if (showUnusedOnly.value) {
    // This would need backend support to check if media is used in posts/pages
    // For now, just a placeholder
    filtered = filtered.filter((item) => {
      // Placeholder logic - in reality, check item.post_count or similar
      return true;
    });
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.filename.toLowerCase().includes(query) ||
        item.alt.toLowerCase().includes(query)
    );
  }

  // Sort items
  filtered.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy.value) {
      case 'name':
        aValue = a.title || a.filename;
        bValue = b.title || b.filename;
        break;
      case 'size':
        aValue = a.file_size || 0;
        bValue = b.file_size || 0;
        break;
      case 'type':
        aValue = a.mime_type;
        bValue = b.mime_type;
        break;
      case 'date':
      default:
        aValue = new Date(a.date_created);
        bValue = new Date(b.date_created);
        break;
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  filteredMedia.value = filtered;
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
 * Toggle tag selection
 */
const toggleTag = (tagId) => {
  const index = selectedTags.value.indexOf(tagId);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagId);
  }
};

/**
 * Check if tag is selected
 */
const isTagSelected = (tagId) => {
  return selectedTags.value.includes(tagId);
};

/**
 * Clear all filters
 */
const clearFilters = () => {
  selectedType.value = 'all';
  showUnusedOnly.value = false;
  dateFilter.value = 'all';
  searchQuery.value = '';
  selectedTags.value = [];
};

/**
 * Handle media upload
 */
const handleUpload = async (files) => {
  if (!files || files.length === 0) return;
  loading.value = true;
  isUploading.value = true;

  // Initialize progress
  uploadProgress.value = {
    current: 0,
    total: files.length,
    percentage: 0,
    currentFileName: files[0]?.name || '',
  };

  try {
    // Upload sequentially to keep server load reasonable
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update progress before upload
      uploadProgress.value.current = i;
      uploadProgress.value.currentFileName = file.name;
      uploadProgress.value.percentage = Math.round((i / files.length) * 100);

      const formData = new FormData();
      formData.append('file', file, file.name);

      try {
        // Use lmnFetch to support remote sites
        const response = await lmnFetch({
          endpoint: 'wp/v2/media',
          type: 'POST',
          data: formData,
          isFormData: true,
        });

        if (response && response.data) {
          successCount += 1;

          // Update progress after successful upload
          uploadProgress.value.current = i + 1;
          uploadProgress.value.percentage = Math.round(
            ((i + 1) / files.length) * 100
          );
        } else {
          throw new Error(
            __('Upload failed - no response data', 'flexify-dashboard')
          );
        }
      } catch (e) {
        console.error('Upload error:', e);
        notify({
          title: __('Upload failed', 'flexify-dashboard'),
          message: `${file.name}: ${e.message || e}`,
          type: 'error',
        });
        // Still update progress even on error
        uploadProgress.value.current = i + 1;
        uploadProgress.value.percentage = Math.round(
          ((i + 1) / files.length) * 100
        );
      }
    }

    // Set to 100% on completion
    uploadProgress.value.percentage = 100;
    uploadProgress.value.current = files.length;

    if (successCount > 0) {
      notify({
        title: __('Files uploaded successfully!', 'flexify-dashboard'),
        message: sprintf(__('%d file(s) uploaded', 'flexify-dashboard'), successCount),
        type: 'success',
      });
      await getMediaData();
    }
  } catch (error) {
    notify({
      title: __('Upload failed', 'flexify-dashboard'),
      type: 'error',
    });
  } finally {
    loading.value = false;
    isUploading.value = false;
    uploadDialog.value = false;

    // Delay hiding progress to show completion
    setTimeout(() => {
      uploadProgress.value = {
        current: 0,
        total: 0,
        percentage: 0,
        currentFileName: '',
      };
    }, 500);
  }
};

/**
 * Trigger native file picker and handle selection
 */
const openUploadDialog = () => {
  if (uploadInput.value) {
    uploadInput.value.click();
  }
};

const onUploadChange = async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length > 0) {
    await handleUpload(files);
  }
  // reset input so the same file can be picked twice
  event.target.value = '';
};

/**
 * Handle drag over event
 */
const handleDragOver = (event) => {
  // Only handle file drags
  if (!event.dataTransfer.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  dragCounter.value++;
  if (!dragOver.value) {
    dragOver.value = true;
  }
};

/**
 * Handle drag enter event (for document level)
 */
const handleDragEnter = (event) => {
  // Only handle file drags
  if (!event.dataTransfer.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Handle drag leave event
 */
const handleDragLeave = (event) => {
  // Only handle file drags
  if (!event.dataTransfer.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  dragCounter.value--;
  if (dragCounter.value === 0) {
    dragOver.value = false;
  }
};

/**
 * Handle drop event
 */
const handleDrop = async (event) => {
  // Only handle file drops
  if (!event.dataTransfer.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  dragOver.value = false;
  dragCounter.value = 0;

  const files = Array.from(event.dataTransfer.files || []);
  if (files.length > 0) {
    await handleUpload(files);
  }
};

// Watchers
watch(
  [searchQuery, selectedType, sortBy, sortOrder, showUnusedOnly, dateFilter],
  () => {
    pagination.value.search = searchQuery.value;
    pagination.value.orderby = sortBy.value;
    pagination.value.order = sortOrder.value;
    pagination.value.page = 1; // Reset to first page when filters change
    mediaItems.value = []; // Clear existing items when filters change
    getMediaData(false);
  }
);

// Watch selectedTags separately with deep watching to catch array mutations
watch(
  selectedTags,
  () => {
    pagination.value.page = 1; // Reset to first page when tags change
    mediaItems.value = []; // Clear existing items when tags change
    getMediaData(false);
  },
  { deep: true }
);

// Watch per_page changes
watch(
  () => pagination.value.per_page,
  () => {
    pagination.value.page = 1; // Reset to first page when per_page changes
    mediaItems.value = []; // Clear existing items when per_page changes
    getMediaData(false);
  }
);

onMounted(() => {
  getMediaData();
  fetchAllTags();

  // Initialize window width
  windowWidth.value = window.innerWidth;

  // Add resize listener
  window.addEventListener('resize', handleResize);

  // Prevent default drag behaviors on document for file drags only
  const preventFileDragDefaults = (e) => {
    // Only prevent defaults for file drags
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Prevent default drag behaviors for files
  ['dragenter', 'dragover'].forEach((eventName) => {
    document.addEventListener(eventName, preventFileDragDefaults, false);
  });
});

onUnmounted(() => {
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
});

/**
 * Handle window resize
 */
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

watch(
  () => route.params.mediaId,
  (newVal) => {
    if (newVal) {
      drawerOpen.value = true;
    } else {
      drawerOpen.value = false;
    }
  },
  { immediate: true, deep: true }
);

// Sync selection from wrapper when in selection mode
watch(
  () => selectionMode?.selectedMediaIds?.value,
  (newIds) => {
    if (selectionMode?.isActive?.value && Array.isArray(newIds)) {
      // Only sync if the IDs are different to avoid infinite loops
      const currentIds = [...selectedMedia.value].sort();
      const incomingIds = [...newIds].sort();
      if (JSON.stringify(currentIds) !== JSON.stringify(incomingIds)) {
        selectedMedia.value = [...newIds];
      }
    }
  },
  { immediate: true, deep: true }
);

// Keep selected type in sync with selection-mode constraints
watch(
  selectionImageType,
  (newType) => {
    if (newType) {
      selectedType.value = newType;
    }
  },
  { immediate: true }
);

// Sync selection when selection mode becomes active
watch(
  () => selectionMode?.isActive?.value,
  (isActive) => {
    if (isActive && selectionMode?.selectedMediaIds?.value) {
      const ids = selectionMode.selectedMediaIds.value;
      if (Array.isArray(ids) && ids.length > 0) {
        selectedMedia.value = [...ids];
      }
    } else if (!isActive) {
      // Clear selection when exiting selection mode
      selectedMedia.value = [];
      lastSelectedIndex.value = null;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="flex h-full text-zinc-900 dark:text-zinc-100 font-sans max-h-full overflow-hidden gap-6 max-md:gap-0 flexify-dashboard-normalize"
    :class="isDark ? 'dark' : ''"
  >
    <!-- Media List Sidebar -->
    <div
      class="md:w-96 w-full flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {{ __('Media Library', 'flexify-dashboard') }}
          </h1>
          <AppButton
            type="primary"
            @click="openUploadDialog"
            :disabled="isUploading"
            :loading="isUploading"
            class="text-sm"
          >
            <AppIcon icon="add" class="text-base" />
          </AppButton>
        </div>

        <!-- Upload Progress Indicator -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-20"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-20"
          leave-to-class="opacity-0 -translate-y-2 max-h-0"
        >
          <div
            v-if="isUploading && uploadProgress.total > 0"
            class="mt-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 mb-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <AppIcon
                  icon="cloud_upload"
                  class="text-sm text-zinc-500 dark:text-zinc-400 flex-shrink-0"
                />
                <span
                  class="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate"
                >
                  {{ uploadProgress.currentFileName }}
                </span>
              </div>
              <span
                class="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0 ml-2"
              >
                {{ uploadProgress.current }} / {{ uploadProgress.total }}
              </span>
            </div>
            <!-- Progress Bar -->
            <div
              class="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden"
            >
              <div
                class="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300 ease-out"
                :style="{ width: `${uploadProgress.percentage}%` }"
              ></div>
            </div>
          </div>
        </Transition>

        <!-- Search Bar -->
        <div class="relative flex items-center">
          <AppIcon
            icon="search"
            class="absolute left-3 text-zinc-400 dark:text-zinc-500 text-lg pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search media...', 'flexify-dashboard')"
            class="w-full bg-zinc-50 dark:bg-zinc-900 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>
      </div>

      <!-- Compact Filter Bar -->
      <div class="px-6 py-3">
        <div class="flex items-center gap-2">
          <!-- Type Filter Pills -->
          <div
            class="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
          >
            <button
              v-if="!selectionImageType"
              @click="selectedType = 'all'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                selectedType === 'all'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('All', 'flexify-dashboard') }}
            </button>
            <button
              v-if="!selectionImageType || selectionImageType === 'image'"
              @click="selectedType = 'image'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                selectedType === 'image'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('Images', 'flexify-dashboard') }}
            </button>
            <button
              v-if="!selectionImageType || selectionImageType === 'video'"
              @click="selectedType = 'video'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                selectedType === 'video'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('Videos', 'flexify-dashboard') }}
            </button>
            <button
              v-if="!selectionImageType || selectionImageType === 'document'"
              @click="selectedType = 'document'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                selectedType === 'document'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('Docs', 'flexify-dashboard') }}
            </button>
            <button
              v-if="!selectionImageType || selectionImageType === 'font'"
              @click="selectedType = 'font'"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                selectedType === 'font'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              {{ __('Fonts', 'flexify-dashboard') }}
            </button>
          </div>

          <!-- Sort & Filter Button -->
          <div class="flex items-center gap-1.5">
            <button
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              class="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
            >
              <AppIcon
                :icon="sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                class="text-sm text-zinc-600 dark:text-zinc-400"
              />
            </button>

            <!-- View Mode Toggle -->
            <button
              @click="viewMode = viewMode === 'list' ? 'grid' : 'list'"
              :class="[
                'p-2 rounded-md transition-colors',
                'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
              :title="
                viewMode === 'list'
                  ? __('Grid View', 'flexify-dashboard')
                  : __('List View', 'flexify-dashboard')
              "
            >
              <AppIcon
                :icon="viewMode === 'list' ? 'grid_view' : 'view_list'"
                class="text-sm text-zinc-600 dark:text-zinc-400"
              />
            </button>

            <button
              @click="filtersExpanded = !filtersExpanded"
              :class="[
                'relative p-2 rounded-md transition-colors',
                activeFiltersCount > 0 || filtersExpanded
                  ? 'bg-zinc-900 dark:bg-zinc-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              ]"
            >
              <AppIcon
                icon="tune"
                :class="[
                  'text-sm',
                  activeFiltersCount > 0 || filtersExpanded
                    ? 'text-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400',
                ]"
              />
              <span
                v-if="activeFiltersCount > 0"
                class="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center"
              >
                {{ activeFiltersCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Expanded Filters Panel -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="filtersExpanded" class="mt-3 pt-3 space-y-3">
            <!-- Sort By -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Sort By', 'flexify-dashboard') }}
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="option in [
                    { value: 'date', label: 'Date', icon: 'schedule' },
                    { value: 'title', label: 'Name', icon: 'sort_by_alpha' },
                    { value: 'size', label: 'Size', icon: 'data_usage' },
                    { value: 'type', label: 'Type', icon: 'category' },
                  ]"
                  :key="option.value"
                  @click="sortBy = option.value"
                  :class="[
                    'flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                    sortBy === option.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                >
                  <AppIcon :icon="option.icon" class="text-sm" />
                  {{ __(option.label, 'flexify-dashboard') }}
                </button>
              </div>
            </div>

            <!-- Date Filter -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Date Range', 'flexify-dashboard') }}
              </label>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="option in [
                    { value: 'all', label: 'All' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'Week' },
                    { value: 'month', label: 'Month' },
                    { value: 'year', label: 'Year' },
                  ]"
                  :key="option.value"
                  @click="dateFilter = option.value"
                  :class="[
                    'px-3 py-2 text-xs font-medium rounded-md transition-colors',
                    dateFilter === option.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  ]"
                >
                  {{ __(option.label, 'flexify-dashboard') }}
                </button>
              </div>
            </div>

            <!-- Tag Filter -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Tags', 'flexify-dashboard') }}
              </label>
              <div class="max-h-48 overflow-y-auto">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="tag in allTags"
                    :key="tag.id"
                    @click="toggleTag(tag.id)"
                    :class="[
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                      isTagSelected(tag.id)
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                    ]"
                  >
                    <span>{{ tag.name }}</span>
                    <span class="text-[10px] opacity-70"
                      >({{ tag.count }})</span
                    >
                    <AppIcon
                      v-if="isTagSelected(tag.id)"
                      icon="check"
                      class="text-xs"
                    />
                  </button>
                </div>
                <p
                  v-if="allTags.length === 0"
                  class="text-xs text-zinc-500 dark:text-zinc-400 px-3 py-2 mt-2"
                >
                  {{ __('No tags available', 'flexify-dashboard') }}
                </p>
              </div>
            </div>

            <!-- Additional Filters -->
            <div>
              <label
                class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5"
              >
                {{ __('Options', 'flexify-dashboard') }}
              </label>
              <button
                @click="showUnusedOnly = !showUnusedOnly"
                :class="[
                  'w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors',
                  showUnusedOnly
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                ]"
              >
                <span class="flex items-center gap-2">
                  <AppIcon icon="block" class="text-sm" />
                  {{ __('Unused Media Only', 'flexify-dashboard') }}
                </span>
                <AppIcon v-if="showUnusedOnly" icon="check" class="text-sm" />
              </button>
            </div>

            <!-- Clear Filters -->
            <button
              v-if="activeFiltersCount > 0"
              @click="clearFilters"
              class="w-full px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {{ __('Clear All Filters', 'flexify-dashboard') }}
            </button>
          </div>
        </transition>
      </div>

      <!-- Results Count -->
      <div class="flex flex-row place-content-between items-center px-6 pr-4">
        <div
          class="py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
        >
          {{ pagination.total }}
          {{
            pagination.total === 1
              ? __('item', 'flexify-dashboard')
              : __('items', 'flexify-dashboard')
          }}
        </div>
      </div>

      <!-- Media List -->
      <div
        class="flex-1 overflow-auto px-6 pb-6 custom-scrollbar relative"
        @dragenter="handleDragEnter"
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
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="dragOver"
            class="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-950/80 flex items-center justify-center z-50 rounded-lg"
          >
            <div class="text-center text-white">
              <AppIcon icon="cloud_upload" class="text-6xl mb-4 mx-auto" />
              <p class="text-xl font-medium">
                {{ __('Drop files to upload', 'flexify-dashboard') }}
              </p>
              <p class="text-sm text-zinc-300 mt-2">
                {{ __('Release to start uploading', 'flexify-dashboard') }}
              </p>
            </div>
          </div>
        </Transition>

        <div v-if="loading && !mediaItems.length" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="image" class="text-zinc-400 text-xl animate-pulse" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ __('Loading media...', 'flexify-dashboard') }}
          </p>
        </div>

        <div v-else-if="filteredMedia.length === 0" class="p-8 text-center">
          <div
            class="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <AppIcon icon="image" class="text-zinc-400 text-xl" />
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {{
              searchQuery || activeFiltersCount > 0
                ? __('No media found', 'flexify-dashboard')
                : __('No media files', 'flexify-dashboard')
            }}
          </p>
          <button
            v-if="activeFiltersCount > 0"
            @click="clearFilters"
            class="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
          >
            {{ __('Clear filters', 'flexify-dashboard') }}
          </button>
        </div>

        <MediaList
          v-else
          :media="filteredMedia"
          :selected-media="selectedMedia"
          :view-mode="viewMode"
          :has-more="hasMore"
          :loading-more="loadingMore"
          @select-media="selectMediaItem"
          @toggle-selection="toggleMediaSelection"
          @delete="handleDelete"
          @load-more="loadMore"
        />
      </div>

      <!-- Hidden upload input -->
      <input
        ref="uploadInput"
        type="file"
        class="hidden"
        multiple
        @change="onUploadChange"
        :accept="allowedFileTypes"
      />
    </div>

    <!-- Right Content Area -->
    <div
      class="flex-1 flex flex-col rounded-3xl bg-white dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-700/30 h-full max-h-full overflow-auto"
    >
      <RouterView key="media-details-content" v-slot="{ Component }">
        <div class="flex-1 flex items-center justify-center" v-if="!Component">
          <div class="text-center">
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <AppIcon icon="image" class="text-2xl text-zinc-400" />
            </div>
            <h3
              class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2"
            >
              {{ __('Media Details', 'flexify-dashboard') }}
            </h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {{
                __(
                  'Select a media file from the list to view details and edit properties.',
                  'flexify-dashboard'
                )
              }}
            </p>
          </div>
        </div>

        <component
          :is="Component"
          v-else-if="Component && windowWidthComputed > 1024"
        />

        <Drawer
          v-else-if="Component && windowWidthComputed <= 1024"
          v-model="drawerOpen"
          size="full"
          :show-header="false"
          :show-close-button="false"
          :close-on-overlay-click="true"
          :close-on-escape="true"
          @close="router.push('/')"
        >
          <component :is="Component" />
        </Drawer>
      </RouterView>
    </div>

    <!-- Floating Action Panel -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="hasSelection"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4"
      >
        <!-- Selection Count -->
        <div
          class="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
        >
          {{ selectedCountText }}
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- View Button -->
          <button
            @click="viewSelectedMedia"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            :title="__('View', 'flexify-dashboard')"
          >
            <AppIcon icon="visibility" class="text-lg" />
          </button>

          <!-- Bulk Edit Button -->
          <button
            @click="openBulkEdit"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            :title="__('Bulk Edit', 'flexify-dashboard')"
          >
            <AppIcon icon="edit" class="text-lg" />
          </button>

          <!-- Download Button -->
          <button
            @click="bulkDownload"
            :disabled="isDownloading"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="__('Download', 'flexify-dashboard')"
          >
            <AppIcon
              :icon="isDownloading ? 'hourglass_empty' : 'download'"
              class="text-lg"
            />
          </button>

          <!-- Duplicate Button -->
          <button
            @click="batchDuplicateMedia"
            :disabled="isDuplicating"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="__('Duplicate', 'flexify-dashboard')"
          >
            <AppIcon
              :icon="isDuplicating ? 'hourglass_empty' : 'content_copy'"
              class="text-lg"
            />
          </button>

          <!-- Delete Button -->
          <button
            @click="handleBatchDelete"
            class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            :title="__('Delete', 'flexify-dashboard')"
          >
            <AppIcon icon="delete" class="text-lg" />
          </button>

          <!-- Clear Selection Button -->
          <button
            @click="clearSelection"
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            :title="__('Clear selection', 'flexify-dashboard')"
          >
            <AppIcon icon="close" class="text-lg" />
          </button>

          <!-- Select Button (only in selection mode) -->
          <template v-if="isInSelectionMode">
            <div class="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>
            <AppButton
              type="primary"
              @click="handleSelectInSelectionMode"
              class="ml-2"
            >
              {{ __('Select', 'flexify-dashboard') }}
            </AppButton>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Confirm Dialog -->
    <Confirm ref="confirmDialog" />

    <!-- Bulk Edit Drawer -->
    <Drawer
      v-model="bulkEditDrawerOpen"
      size="md"
      :show-header="true"
      :show-close-button="true"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <AppIcon icon="edit" class="text-lg" />
          <h2 class="text-lg font-semibold">
            {{ __('Bulk Edit Media', 'flexify-dashboard') }}
          </h2>
        </div>
      </template>

      <div class="space-y-6 p-6">
        <div>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {{
              selectedMedia.length === 1
                ? __(
                    'Editing 1 item. Leave fields empty to keep existing values.',
                    'flexify-dashboard'
                  )
                : __(
                    'Editing %d items. Leave fields empty to keep existing values.',
                    'flexify-dashboard'
                  ).replace('%d', selectedMedia.length)
            }}
          </p>
        </div>

        <!-- Title -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Title', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="bulkEditForm.title"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
          />
        </div>

        <!-- Alt Text -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Alt Text', 'flexify-dashboard') }}
          </label>
          <AppInput
            v-model="bulkEditForm.alt_text"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
          />
        </div>

        <!-- Caption -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Caption', 'flexify-dashboard') }}
          </label>
          <AppTextArea
            v-model="bulkEditForm.caption"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
            rows="3"
          />
        </div>

        <!-- Description -->
        <div>
          <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            {{ __('Description', 'flexify-dashboard') }}
          </label>
          <AppTextArea
            v-model="bulkEditForm.description"
            :placeholder="__('Leave empty to keep existing', 'flexify-dashboard')"
            rows="4"
          />
        </div>

        <!-- Actions -->
        <div
          class="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700"
        >
          <AppButton
            @click="bulkEditDrawerOpen = false"
            type="default"
            class="flex-1"
          >
            {{ __('Cancel', 'flexify-dashboard') }}
          </AppButton>
          <AppButton
            @click="saveBulkEdit"
            type="primary"
            :loading="isBulkEditing"
            class="flex-1"
          >
            {{ __('Save Changes', 'flexify-dashboard') }}
          </AppButton>
        </div>
      </div>
    </Drawer>
  </div>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

<style>
#wpbody,
#wpcontent {
  padding: 0 !important;
}

html {
  --fd-body-height: calc(100vh - var(--fd-toolbar-height) - 1rem);
}
</style>
