<script setup>
import { ref, defineModel, defineProps } from 'vue';

import AppIcon from '@/components/utility/icons/index.vue';
import MediaLibrary from '@/components/utility/media-library-v2/index.vue';

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { notify } from '@/assets/js/functions/notify.js';

const model = defineModel();
const props = defineProps(['post', 'teleportArea']);
const medialibrary = ref(null);

const openMediaView = async () => {
  // Only allow editing if user has access
  if (!props.post.is_editable) return;

  const selected = await medialibrary.value.select({
    multiple: false,
    imageTypes: 'image',
    chosen: model.value.image_id ? [model.value.image_id] : [],
  });

  // Cancelled by user
  if (!selected || !Array.isArray(selected) || !selected.length) return;

  const { title, id, source_url, mime_type } = selected[0];
  if (!mime_type.includes('image')) return;

  model.value.image_url = source_url;
  model.value.image_id = id;

  updatePostImage();
};

const updatePostImage = async () => {
  if (!props.post || !model.value.image_id) return;

  const args = {
    endpoint: `wp/v2/${props.post.rest_base}/${props.post.id}`,
    params: {},
    data: { featured_media: model.value.image_id },
    type: 'POST',
  };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: 'success', title: __('Featured image updated', 'flexify-dashboard') });
};
</script>

<template>
  <div
    @click.stop="openMediaView"
    class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col items-center justify-center shrink-0"
  >
    <img
      v-if="model.image_url"
      :src="model.image_url"
      class="object-cover object-center h-full w-full"
    />
    <AppIcon v-else icon="image" class="text-xl" />
  </div>
  <Teleport :disabled="!teleportArea" :to="teleportArea">
    <MediaLibrary @click.stop ref="medialibrary" />
  </Teleport>
</template>
