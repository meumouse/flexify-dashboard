<script setup>
// Vue
import { defineModel, ref, computed, watch, watchEffect, defineExpose } from "vue";

// Components
import AppIcon from "@/components/utility/icons/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import AppTextarea from "@/components/utility/text-area/index.vue";
import AppCheckbox from "./src/checkbox.vue";
import AppToggle from "@/components/utility/toggle/index.vue";
import ContextMenu from "@/components/utility/context-menu/index.vue";
import Confirm from "@/components/utility/confirm/index.vue";

// Funcs
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { extractMediaLink } from "@/assets/js/functions/extractMediaLink/index.js";
import { formatDateString } from "@/assets/js/functions/formatDateString.js";
import { v4 as uuidv4 } from "uuid";

// Store
import { useAppStore } from "@/store/app/app.js";
const appStore = useAppStore();

// Refs
const loading = ref(false);
const paginationLoading = ref(false);
const open = ref(false);
const selected = ref([]);
const media = ref([]);
const imageInspect = ref(null);
const filterPanel = ref(null);
const typesPanel = ref(null);
const searchController = ref(null);
const activeRequestCount = ref(0);
const previewToggle = ref("preview");
const confirm = ref(null);
const deleting = ref(false);
const imageupload = ref(null);
const uploading = ref(false);
const resolvePromise = ref(null);
const rejectPromise = ref(null);
const mediapanel = ref(null);
const lastSelectedIndex = ref(null);
const duplicating = ref(false);
const dragDrop = ref({ dragging: false, fileCount: 0, dragCounter: 0 });
const pagination = ref({ search: "", per_page: 30, page: 1, pages: 0, total: 0, context: "edit", media_type: null, orderby: "date", order: "desc" });

const orderOptions = [
  { label: __("Date", "flexify-dashboard"), value: "date" },
  { label: __("ID", "flexify-dashboard"), value: "id" },
  { label: __("Modified", "flexify-dashboard"), value: "modified" },
  { label: __("Slug", "flexify-dashboard"), value: "slug" },
  { label: __("Title", "flexify-dashboard"), value: "title" },
];

const mimeTypeOptions = [
  { label: "All Media", value: null },
  { label: "Images", value: "image" },
  { label: "Video", value: "video" },
  { label: "Text", value: "text" },
  { label: "Applications", value: "application" },
  { label: "Audio", value: "audio" },
];

const orderDirection = [
  { label: "Descending", value: "desc" },
  { label: "Ascending", value: "asc" },
];

const previewOptions = {
  preview: { label: "Preview", value: "preview" },
  details: { label: "Details", value: "details" },
};

const select = ({ single = false, chosen = [] }) => {
  getMedia();

  open.value = true;
  // Return promise so the caller can get results
  return new Promise((resolve, reject) => {
    resolvePromise.value = resolve;
    rejectPromise.value = reject;
  });
};

/**
 * Fetches media items from the WordPress REST API
 * @async
 * @param {boolean} suppressLoading - If true, prevents the loading state from being set
 * @returns {Promise<void>}
 */
const getMedia = async (suppressLoading) => {
  if (!suppressLoading) {
    loading.value = true;
  } else {
    paginationLoading.value = true;
  }

  // Increment active request counter
  activeRequestCount.value++;

  const args = { endpoint: "wp/v2/media", params: pagination.value, signal: searchController.value?.signal };
  const response = await lmnFetch(args);

  // Decrement active request counter
  activeRequestCount.value--;

  // Only set loading to false if there are no active requests
  if (activeRequestCount.value === 0) {
    loading.value = false;
  }

  paginationLoading.value = false;

  // Something went wrong
  if (!response) return;

  media.value = [...media.value, ...response.data];

  // Update pagination
  pagination.value.pages = response.totalPages;
  pagination.value.total = response.totalItems;
};

/**
 * Handles scroll events to implement infinite scrolling
 * @async
 * @param {Object} param0 - The scroll event target object
 * @param {Element} param0.target - The DOM element being scrolled
 * @returns {Promise<void>}
 */
const onScroll = async ({ target }) => {
  const scrollTop = target.scrollTop;
  const clientHeight = target.clientHeight;
  const scrollHeight = target.scrollHeight;

  if (scrollTop + clientHeight >= scrollHeight - 5 && !loading.value) {
    handleNextPage(); // Load more content
  }
};

/**
 * Loads the next page of media items when scrolling
 * @returns {void}
 */
const handleNextPage = () => {
  // End of items
  if (pagination.value.page == pagination.value.pages) return;

  pagination.value.page += 1;
  getMedia(true);
};

/**
 * Checks if an image is currently selected
 * @param {Object} image - The image object to check
 * @returns {boolean} True if the image is selected, false otherwise
 */
const isSelected = (image) => {
  if (!Array.isArray(selected.value)) {
    selected.value = [];
  }

  return selected.value.find((item) => item.id == image.id) ? true : false;
};

/**
 * Toggles the selection state of an image
 * @param {Object} image - The image object to toggle
 * @param {Event} event - The click event to check for shift key
 * @returns {void}
 */
const toggleImage = (image, event) => {
  // Get current image index
  const currentIndex = media.value.findIndex((item) => item.id === image.id);

  // Handle shift + click
  if (event.shiftKey && lastSelectedIndex.value !== null) {
    // Get range between last selected and current
    const start = Math.min(lastSelectedIndex.value, currentIndex);
    const end = Math.max(lastSelectedIndex.value, currentIndex);

    // Get all images in the range
    const rangeSelection = media.value.slice(start, end + 1);

    // Add all images in range to selection (if they aren't already selected)
    selected.value = [...new Set([...selected.value, ...rangeSelection])];
  } else {
    // Normal toggle behavior
    if (isSelected(image)) {
      // Remove the image
      selected.value = selected.value.filter((item) => item.id !== image.id);
    } else {
      // Add the image
      selected.value = [...selected.value, image];
    }

    // Update last selected index
    lastSelectedIndex.value = currentIndex;
  }
};

/**
 * Clears all selected images
 * @returns {void}
 */
const clearSelection = () => {
  selected.value = [];
  lastSelectedIndex.value = null;
};

/**
 * Sets an image for preview/inspection
 * @param {Object} image - The image object to preview
 * @returns {void}
 */
const previewImage = (image) => {
  imageInspect.value = image;
};

/**
 * Navigates to the previous image in the media list
 * @returns {void}
 */
const previousImage = () => {
  const currentIndex = media.value.findIndex((item) => item.id == imageInspect.value.id);

  if (currentIndex >= 1) {
    const key = currentIndex - 1;
    imageInspect.value = media.value[key];
  }
};

/**
 * Navigates to the next image in the media list
 * @returns {void}
 */
const nextImage = () => {
  const currentIndex = media.value.findIndex((item) => item.id == imageInspect.value.id);

  if (currentIndex < media.value.length - 1) {
    const key = currentIndex + 1;
    imageInspect.value = media.value[key];
  }
};

/**
 * Returns the human-readable label for a media type
 * @param {string} type - The media MIME type
 * @returns {string} The human-readable label for the media type
 */
const returnMediaLabel = (type) => {
  const mediaItem = mimeTypeOptions.find((item) => item.value == type);
  return mediaItem ? mediaItem.label : type;
};

/**
 * Updates the details of the currently inspected image
 * @async
 * @returns {Promise<void>}
 */
const updateImageDetails = async () => {
  const data = {
    title: imageInspect.value.title.raw,
    description: imageInspect.value.description.raw,
    caption: imageInspect.value.caption.raw,
    alt_text: imageInspect.value.alt_text,
  };

  const args = { endpoint: `wp/v2/media/${imageInspect.value.id}`, params: {}, data, type: "POST" };
  const response = await lmnFetch(args);

  notify({ title: __("File updated", "flexify-dashboard"), type: "success" });
};

/**
 * Deletes the currently inspected image after user confirmation
 * @async
 * @returns {Promise<void>}
 */
const deleteImage = async () => {
  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to delete this item? This action cannot be undone.", "flexify-dashboard"),
    okButton: __("Yes delete it", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  deleting.value = true;
  await deleteSingleImage(imageInspect.value.id);
  deleting.value = false;

  imageInspect.value = null;

  notify({ title: __("File deleted", "flexify-dashboard"), type: "success" });
};

/**
 * Deletes a single image by ID
 * @async
 * @param {number|string} imageid - The ID of the image to delete
 * @returns {Promise<void>}
 */
const deleteSingleImage = async (imageid) => {
  const args = { endpoint: `wp/v2/media/${imageid}`, params: { force: true }, type: "DELETE" };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  // Find file in list and remove it:
  const currentIndex = media.value.findIndex((item) => item.id == imageid);
  if (currentIndex >= 0) {
    media.value.splice(currentIndex, 1);
  }
};

/**
 * Deletes a single image by ID
 * @async
 * @param {number|string} imageid - The ID of the image to delete
 * @returns {Promise<void>}
 */
const batchDuplicate = async () => {
  duplicating.value = true;

  for (let image of selected.value) {
    // Get file extension from original URL or filename
    const fileExtension = image.source_url.split(".").pop().toLowerCase();
    const fileName = `${image.title.rendered}.${fileExtension}`;

    // Fetch image and create blob with correct MIME type
    const imageResponse = await fetch(image.source_url);
    const imageBlob = await imageResponse.blob();

    // Create new blob with correct MIME type
    const mimeType = `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;
    const fileWithType = new Blob([imageBlob], { type: mimeType });

    // Create a File object (WordPress handles Files better than Blobs)
    const fileObject = new File([fileWithType], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append("file", fileObject);
    formData.append("title", image.title.rendered);
    formData.append("alt_text", image.alt_text);
    formData.append("caption", image.caption.rendered);
    formData.append("description", image.description.rendered);

    const args = { endpoint: `wp/v2/media`, params: {}, type: "POST", data: formData, isFormData: true };
    const response = await lmnFetch(args);

    if (!response) continue;

    media.value = [response.data, ...media.value];
  }

  duplicating.value = false;
  clearSelection();
  notify({ title: __("Files duplicated", "flexify-dashboard"), type: "success" });
};

/**
 * Deletes multiple selected images after user confirmation
 * @async
 * @returns {Promise<void>}
 */
const batchDelete = async () => {
  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to delete these files? This action cannot be undone.", "flexify-dashboard"),
    okButton: __("Yes delete them", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  deleting.value = true;

  for (let item of selected.value) {
    await deleteSingleImage(item.id);
  }

  deleting.value = false;

  selected.value = [];

  notify({ title: __("Files deleted", "flexify-dashboard"), type: "success" });
};

/**
 * Handles file upload events, processing multiple files
 * @async
 * @param {Event} evt - The file input change event
 * @returns {Promise<void>}
 */
const handleFileUpload = async (evt, fromDrop) => {
  dragDrop.value.dragging = false;
  uploading.value = true;
  const files = fromDrop ? getFilesFromEvent(evt) : evt.target.files;
  const processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Not a valid file type
    if (!appStore.state.mimeTypes.includes(file.type)) continue;

    const id = uuidv4();

    const fileObj = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      mime_type: file.type,
      lastModified: file.lastModified,
      uploading: true,
      title: {
        rendered: file.name,
        raw: file.name,
      },
      rawFile: file,
    };

    // If it's an image, create a preview URL
    if (file.type.startsWith("image/")) {
      const previewUrl = await createPreviewUrl(file);
      fileObj.source_url = previewUrl;
    }

    processedFiles.push(fileObj);
  }

  media.value = [...processedFiles, ...media.value];

  for (let subfile of processedFiles) {
    await uploadSingleFile(subfile.rawFile, subfile.id);
  }

  uploading.value = false;
};

/**
 * Get's files from a given event
 *
 * @param {Object} file
 */
const getFilesFromEvent = (evt) => {
  // Set files
  let files = [];
  if (evt.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (let i = 0; i < evt.dataTransfer.items.length; i++) {
      if (evt.dataTransfer.items[i].kind === "file") {
        files.push(evt.dataTransfer.items[i].getAsFile());
      }
    }
  } else if (event.dataTransfer.files) {
    // Use DataTransfer interface to access the file(s)
    files = evt.dataTransfer.files;
  }

  return files;
};

/**
 * Uploads a single file to the WordPress media library
 * @async
 * @param {File} file - The file to upload
 * @param {string} id - Temporary ID assigned to the file during upload
 * @returns {Promise<void>}
 */
const uploadSingleFile = async (file, id) => {
  const formData = new FormData();
  formData.append("file", file);

  const args = { endpoint: `wp/v2/media`, params: {}, type: "POST", data: formData, isFormData: true };
  const response = await lmnFetch(args);

  if (!response) return;

  const existingIndex = media.value.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    media.value.splice(existingIndex, 1, response.data);
  }

  notify({ title: __("File uploaded", "flexify-dashboard"), message: file.name, type: "success" });
};

/**
 * Creates a data URL for image preview
 * @param {File} file - The image file to create a preview for
 * @returns {Promise<string>} A promise that resolves with the data URL
 */
const createPreviewUrl = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
};

/**
 * Handles drag over event
 *
 * @param {Object} evt
 */
const handleDragover = (evt) => {
  dragDrop.value.dragging = true;
  dragDrop.value.dragCounter++;
  // Only activate once
  if (dragDrop.value.dragCounter !== 1) return;
};

/**
 * Handles drag leave event
 *
 * @param {Object} evt
 */
const handleDragLeave = (evt) => {
  dragDrop.value.dragCounter--;
  if (dragDrop.value.dragCounter !== 0) return;
  // Reset drag
  dragDrop.value.dragging = false;
};

const confirmSelection = () => {
  resolvePromise.value(selected.value);
  selected.value = [];
  open.value = false;
  imageInspect.value = null;
};

const cancelSelection = () => {
  resolvePromise.value(false);
  selected.value = [];
  open.value = false;
  imageInspect.value = null;
};

const maybeClose = (evt) => {
  if (!mediapanel.value) return;
  if (mediapanel.value.contains(evt.target) || mediapanel.value == evt.target) return;
  cancelSelection();
};

/**
 * Computed property that checks if any images are selected
 * @returns {boolean} True if there are selected images, false otherwise
 */
const hasSelection = computed(() => {
  if (!selected.value) return false;
  return selected.value.length;
});

const togglePaginationOrder = () => {
  if (pagination.value.order === "asc") pagination.value.order = "desc";
  else pagination.value.order = "asc";

  media.value = [];
  imageInspect.value = null;
  pagination.value.page = 1;
  pagination.value.pages = 0;
  getMedia();
};

// Watches for newly empty searches and resets media
watch(
  () => pagination.value.search,
  (newVal, oldVal) => {
    // Cancel any pending request
    if (searchController.value) {
      searchController.value.abort();
    }

    // Create new controller for this request
    searchController.value = new AbortController();
    loading.value = true;

    imageInspect.value = null;
    pagination.value.page = 1;
    pagination.value.pages = 0;

    media.value = [];
    getMedia();
  }
);

// Watches for orderby changes
watch(
  () => pagination.value.orderby,
  (newVal, oldVal) => {
    media.value = [];
    imageInspect.value = null;
    pagination.value.page = 1;
    pagination.value.pages = 0;
    getMedia();
  }
);

// Watches for filetype changes
watch(
  () => pagination.value.media_type,
  (newVal, oldVal) => {
    media.value = [];
    imageInspect.value = null;
    pagination.value.page = 1;
    pagination.value.pages = 0;
    getMedia();
  }
);

/**
 * Exposes open and close methods
 */
defineExpose({
  select,
});
</script>

<template>
  <Transition>
    <div class="fixed top-0 left-0 right-0 h-dvh max-h-dvh max-w-dvw bg-zinc-900/40 flex flex-row z-[99999] items-center place-content-center" v-if="open" @click="maybeClose">
      <div class="w-[900px] max-w-full rounded-xl shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex flex-col h-[700px] max-h-[100dvh]" ref="mediapanel">
        <!-- Title block -->
        <div class="flex flex-row items-center place-content-between p-6 pb-0">
          <div class="font-semibold">{{ __("Media Library", "flexify-dashboard") }}</div>
          <AppButton type="transparent" @click="cancelSelection"><AppIcon icon="close" /></AppButton>
        </div>

        <!-- Filters -->
        <div class="flex flex-row gap-3 p-6 border-b border-zinc-200 dark:border-zinc-700 items-center">
          <div class="grow flex place-items-start gap-3">
            <AppInput type="text" v-model="pagination.search" icon="search" :placeholder="__('Search', 'flexify-dashboard')" />
          </div>

          <div class="flex flex-row gap-2">
            <!-- File type options -->
            <AppButton type="default" @click="($event) => typesPanel.show($event)">
              <div class="flex flex-row items-center gap-3" v-if="!pagination.media_type">
                <span class="text-sm">{{ __("File type", "flexify-dashboard") }}</span>
                <AppIcon icon="unfold" />
              </div>
              <div class="flex flex-row items-center gap-3" v-else>
                <span class="text-sm">{{ returnMediaLabel(pagination.media_type) }}</span>
                <AppIcon icon="close" class="cursor-pointer" @click.stop.prevent="pagination.media_type = null" />
              </div>
            </AppButton>
            <ContextMenu ref="typesPanel">
              <fieldset class="flex flex-col gap-2 p-3">
                <label v-for="(item, index) in mimeTypeOptions" :key="index" class="flex flex-row gap-2 items-center" @click="pagination.media_type = item.value">
                  <input type="radio" :id="item.value" name="orderby" :value="item.value" v-model="pagination.media_type" />
                  <span>{{ item.label }}</span>
                </label>
              </fieldset>
            </ContextMenu>

            <!-- Order direction -->
            <AppButton type="default" @click="togglePaginationOrder">
              <div class="flex flex-row items-center gap-3">
                <AppIcon :icon="pagination.order == 'asc' ? 'arrow_up' : 'arrow_down'" />
              </div>
            </AppButton>

            <!-- Sort by options -->
            <AppButton type="default" @click="($event) => filterPanel.show($event)"><AppIcon icon="sort" class="text-lg" /></AppButton>
            <ContextMenu ref="filterPanel">
              <fieldset class="flex flex-col gap-2 p-3">
                <label v-for="(item, index) in orderOptions" :key="index" class="flex flex-row gap-2 items-center" @click="pagination.orderby = item.value">
                  <input type="radio" :id="item.value" name="orderby" :value="item.value" v-model="pagination.orderby" />
                  <span>{{ item.label }}</span>
                </label>
              </fieldset>
            </ContextMenu>

            <AppButton type="default" class="text-sm" @click="imageupload.click($event)" :loading="uploading">
              {{ __("Upload", "flexify-dashboard") }}
              <input type="file" ref="imageupload" multiple :accept="appStore.state.mimeTypes.join(',')" @change="handleFileUpload($event, false)" class="hidden" />
            </AppButton>
          </div>
        </div>

        <div class="grow overflow-hidden" :class="imageInspect ? 'flex flex-row' : ''">
          <!-- Image list -->
          <div class="@container max-h-full h-full" :class="imageInspect ? 'w-1/2 flex-shrink-0' : ''">
            <div
              class="grid gap-3 max-h-full overflow-auto @[300px]:grid-cols-3 @[500px]:grid-cols-4 @[700px]:grid-cols-6 px-6 py-4"
              :class="dragDrop.dragging ? 'bg-brand-900/20' : ''"
              @scroll="onScroll"
              @dragenter.prevent="handleDragover"
              @dragover.prevent
              @dragleave="handleDragLeave"
              @drop.prevent="handleFileUpload($event, true)"
            >
              <!-- Loading -->
              <div class="flex flex-col gap-3 items-center p-3" v-for="index in 24" v-if="loading">
                <div class="w-full aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
                <div class="w-2/3 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
              </div>

              <!-- Not Loading -->
              <div
                v-else
                class="flex flex-col gap-3 items-center p-3 rounded hover:bg-zinc-100 hover:dark:bg-zinc-800 transition-colors rounded-lg cursor-pointer group/media"
                :class="isSelected(image) ? 'bg-zinc-100 dark:bg-zinc-800' : ''"
                v-for="(image, index) in media"
                @click="toggleImage(image, $event)"
                :key="index"
              >
                <div class="w-full h-full aspect-square rounded-lg overflow-hidden relative border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-900">
                  <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg relative max-h-full overflow-hidden max-w-full h-full">
                    <img :src="extractMediaLink(image)" class="w-full object-contain object-center h-full rounded-lg" />
                    <div class="absolute top-0 left-0 right-0 bottom-0 bg-zinc-900/30 opacity-0 group-hover/media:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  </div>

                  <div class="absolute p-3 top-0 left-0 group-hover/media:opacity-100 transition-opacity" :class="isSelected(image) ? 'opacity-100' : 'opacity-0'" v-if="!image.uploading">
                    <AppCheckbox :isactive="isSelected(image)" :key="index" />
                  </div>

                  <div
                    v-if="image.uploading"
                    class="absolute top-0 left-0 right-0 bottom-0 bg-zinc-900/30 pointer-events-none rounded-lg flex flex-col place-content-center justify-center items-center"
                  >
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>

                  <div class="absolute p-3 right-0 bottom-0 opacity-0 group-hover/media:opacity-100 transition-opacity" v-if="!image.uploading">
                    <div class="rounded bg-brand-700 p-1 text-white cursor-pointer" @click.stop.prevent="previewImage(image)"><AppIcon icon="preview" /></div>
                  </div>
                </div>
                <div class="text-sm truncate max-w-full w-full text-center" v-html="image.title.rendered"></div>
              </div>

              <div v-if="paginationLoading" class="@[300px]:col-span-3 @[500px]:col-span-4 @[700px]:col-span-6 p-6 flex flex-row place-content-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>

            <!-- Empty-->
            <div v-if="!loading && !media.length" class="flex flex-col place-content-center justify-center items-center gap-2 text-center h-full">
              <AppIcon icon="search" class="text-4xl" />
              <div class="font-semibold text-xl">{{ __("No results found", "flexify-dashboard") }}</div>
              <div class="text-zinc-500">
                {{ __("Edit your search criteria, or upload a new file.", "flexify-dashboard") }}
              </div>
            </div>
          </div>

          <!-- Image inspect -->
          <div v-if="imageInspect" class="bg-zinc-100 dark:bg-zinc-800 h-full max-h-full overflow-hidden flex flex-col p-6" :class="imageInspect ? 'w-1/2 flex-shrink-0' : ''">
            <!-- Header -->
            <div class="flex flex-row items-center place-content-between">
              <AppToggle :options="previewOptions" v-model="previewToggle" style="width: auto" />
              <AppButton type="transparent" @click.stop="imageInspect = null">
                <AppIcon icon="close" />
              </AppButton>
            </div>

            <!-- Image details -->
            <div v-if="previewToggle == 'details'" class="grid grid-cols-3 pl-3 pt-6 gap-3">
              <!-- Title -->
              <div class="text-zinc-500 pt-2">
                <span>{{ __("Title", "flexify-dashboard") }}</span>
              </div>
              <div class="col-span-2"><AppInput type="text" v-model="imageInspect.title.raw" @change="updateImageDetails" /></div>

              <!-- Alt text -->
              <div class="text-zinc-500 pt-2">
                <span>{{ __("Alt text", "flexify-dashboard") }}</span>
              </div>
              <div class="col-span-2"><AppTextarea type="text" v-model="imageInspect.alt_text" @change="updateImageDetails" /></div>

              <!-- Caption -->
              <div class="text-zinc-500 pt-2">
                <span>{{ __("Caption", "flexify-dashboard") }}</span>
              </div>
              <div class="col-span-2"><AppTextarea type="text" v-model="imageInspect.caption.raw" @change="updateImageDetails" /></div>

              <!-- Description -->
              <div class="text-zinc-500 pt-2">
                <span>{{ __("Description", "flexify-dashboard") }}</span>
              </div>
              <div class="col-span-2"><AppTextarea type="text" v-model="imageInspect.description.raw" @change="updateImageDetails" /></div>

              <!-- Title -->
              <div class="text-zinc-500 pt-2">
                <span>{{ __("URL", "flexify-dashboard") }}</span>
              </div>
              <div class="col-span-2"><AppInput type="text" v-model="imageInspect.link" :disabled="true" :copy="true" /></div>

              <div class="col-span-3 flex flex-row place-content-end">
                <AppButton type="danger" @click="deleteImage" class="text-sm" :loading="deleting">{{ __("Delete file", "flexify-dashboard") }}</AppButton>
              </div>
            </div>

            <!-- Preview image -->
            <template v-if="previewToggle == 'preview'">
              <!-- Image Container -->
              <div class="flex min-h-0 my-6 flex items-center flex-row gap-1 place-content-between grow">
                <!-- Previous image -->
                <AppButton type="transparent" class="shrink-0 flex-nowrap" @click="previousImage">
                  <AppIcon icon="chevron_left" />
                </AppButton>

                <!-- Preview -->
                <div class="h-fit w-fit rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900">
                  <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <img :src="extractMediaLink(imageInspect, 'large')" class="max-w-full max-h-[240px] object-contain object-center rounded-lg" />
                  </div>
                </div>

                <!-- Next image -->
                <AppButton type="transparent" class="shrink-0 flex-nowrap" @click="nextImage">
                  <AppIcon icon="chevron_right" />
                </AppButton>
              </div>

              <!-- Footer -->
              <div class="flex-none flex flex-col">
                <div class="font-semibold" v-html="imageInspect.title.rendered"></div>
                <div class="flex flex-row gap-2">
                  <div class="text-sm text-zinc-500">{{ formatDateString(imageInspect.date) }}</div>
                  <div class="text-sm text-zinc-500" v-if="imageInspect.media_details?.width">|</div>
                  <div class="text-sm text-zinc-500" v-if="imageInspect.media_details?.width">{{ imageInspect.media_details?.width }} x {{ imageInspect.media_details?.height }}</div>
                  <div class="text-sm text-zinc-500">|</div>
                  <div class="text-sm text-zinc-500">ID: {{ imageInspect.id }}</div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-row items-center place-content-between gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
          <div class="grow flex flex-row items-center gap-3 text-sm">
            <AppButton type="danger" v-if="hasSelection" @click.stop="batchDelete" :loading="deleting">{{ __("Delete selected", "flexify-dashboard") }}</AppButton>
            <AppButton type="default" v-if="hasSelection" @click.stop="batchDuplicate" :loading="duplicating">{{ __("Duplicate selected", "flexify-dashboard") }}</AppButton>
            <AppButton type="transparent" v-if="hasSelection" @click.stop="clearSelection">{{ __("Clear selection", "flexify-dashboard") }}</AppButton>
          </div>
          <Confirm ref="confirm" />
          <AppButton type="default" @click="cancelSelection">{{ __("Cancel", "flexify-dashboard") }}</AppButton>
          <AppButton type="primary" @click="confirmSelection">{{ __("Done", "flexify-dashboard") }}</AppButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
