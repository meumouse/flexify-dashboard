<script setup>
import { ref, defineModel, defineProps } from "vue";

// Import comps
import AppIcon from "@/components/utility/icons/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import MediaLibrary from "@/components/utility/media-library-v2/index.vue";

// Refs
const image = defineModel();
const trigger = ref(null);
const props = defineProps(["placeholder"]);
const medialibrary = ref(null);

/**
 * Opens the enhanced Media Library selector.
 *
 * This function performs the following operations:
 * 1. Opens the enhanced media library modal.
 * 2. Filters to show only image files.
 * 3. When an image is selected, it updates the image value with the selected image URL.
 *
 * @function openMediaSelector
 * @returns {Promise<void>}
 */
const openMediaSelector = async () => {
  if (!medialibrary.value) return;

  try {
    const selected = await medialibrary.value.select({
      imageTypes: "image", // Filter to show only image files
      multiple: false,
      chosen: [],
    });

    // User cancelled selection or no selection
    if (!Array.isArray(selected) || selected.length === 0) {
      return;
    }

    const file = selected[0];
    const { source_url } = file;

    // Update the image value with the selected image URL
    image.value = source_url;
  } catch (error) {
    console.error("Error selecting media:", error);
  }
};
</script>

<template>
  <div class="flex flex-col w-48">
    <div
      class="relative group border border-zinc-200 dark:border-zinc-700 cursor-pointer rounded-tl-xl rounded-tr-xl w-48 h-32 flex flex-col place-content-center bg-zinc-50 dark:bg-zinc-800 overflow-hidden border-b-0"
      @click="openMediaSelector()"
    >
      <img v-if="image" :src="image" class="rounded-xl w-48 h-32 object-contain" />
      <AppIcon v-else icon="image" class="text-4xl my-auto mx-auto text-zinc-500 group-hover:text-zinc-900 group-hover:dark:text-zinc-100 transition-colors" />
      <div class="absolute opacity-0 group-hover:opacity-100 pt-1 pr-1 top-0 right-0" v-if="image">
        <AppButton type="transparent" @click.stop.prevent="image = ''">
          <AppIcon icon="close" />
        </AppButton>
      </div>
    </div>
    <AppInput v-model="image" type="text" :placeholder="placeholder || __('url', 'flexify-dashboard')" class="rounded-tl-none rounded-tr-none" />
    <!-- Media Library Component -->
    <MediaLibrary ref="medialibrary" :should-teleport="true" />
  </div>
</template>
