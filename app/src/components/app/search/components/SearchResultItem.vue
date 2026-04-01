<script setup>
import AppIcon from '@/components/utility/icons/index.vue';
import { formatRelativeDate } from '../utils/formatRelativeDate.js';
import { getStatusBadgeClass, getStatusLabel } from '../utils/getStatusBadge.js';

const props = defineProps({
  result: {
    type: Object,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);

const handleClick = () => {
  emit('click', props.result, props.category);
};
</script>

<template>
  <li
    :class="[
      'p-2 rounded-lg transition-all cursor-pointer pl-3',
      isActive
        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100'
        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100',
    ]"
  >
    <a :href="link" class="flex flex-row items-center gap-3" @click="handleClick">
      <!-- User Avatar -->
      <div
        v-if="category === 'user'"
        class="w-8 aspect-square bg-zinc-700 dark:bg-brand-700 text-white rounded-full font-semibold flex place-content-center items-center justify-center shrink-0 relative overflow-hidden"
      >
        <span class="uppercase text-xs">{{
          (result.slug || result.name || result.email || '').charAt(0)
        }}</span>
      </div>

      <!-- Attachment Thumbnail -->
      <div
        v-if="category === 'attachment'"
        class="w-8 aspect-square bg-zinc-200 dark:bg-zinc-700 rounded font-semibold flex place-content-center items-center justify-center shrink-0 relative overflow-hidden"
      >
        <img
          v-if="result.mime_type && result.mime_type.includes('image')"
          :src="result.source_url"
          class="w-8 h-8 object-cover rounded"
        />
        <AppIcon v-else icon="description" class="text-zinc-400" />
      </div>

      <!-- Post Thumbnail -->
      <div
        v-if="(category === 'post' || category === 'page') && result.featured_media"
        class="w-8 aspect-square bg-zinc-200 dark:bg-zinc-700 rounded flex place-content-center items-center justify-center shrink-0 relative overflow-hidden"
      >
        <img
          v-if="
            result._embedded &&
            result._embedded['wp:featuredmedia'] &&
            result._embedded['wp:featuredmedia'][0]
          "
          :src="result._embedded['wp:featuredmedia'][0].source_url"
          class="w-8 h-8 object-cover rounded"
        />
        <AppIcon v-else icon="description" class="text-zinc-400 text-sm" />
      </div>

      <!-- Default Icon -->
      <div
        v-if="
          category !== 'user' &&
          category !== 'attachment' &&
          (!result.featured_media || (category !== 'post' && category !== 'page'))
        "
        class="w-8 aspect-square bg-zinc-200 dark:bg-zinc-700 rounded flex place-content-center items-center justify-center shrink-0"
      >
        <AppIcon
          :icon="
            category === 'category'
              ? 'folder'
              : category === 'menu'
              ? 'menu'
              : 'description'
          "
          class="text-zinc-400 text-sm"
        />
      </div>

      <div class="grow min-w-0 flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span
            class="truncate font-medium text-zinc-900 dark:text-zinc-100"
            v-html="result.name || result.title?.rendered || result.email"
          ></span>
          <!-- Status Badge -->
          <span
            v-if="result.status && (category === 'post' || category === 'page')"
            :class="[
              'px-1.5 py-0.5 rounded text-xs font-medium',
              getStatusBadgeClass(result.status),
            ]"
          >
            {{ getStatusLabel(result.status) }}
          </span>
        </div>
        <!-- Metadata -->
        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span v-if="result.date && (category === 'post' || category === 'page')">{{
            formatRelativeDate(result.date)
          }}</span>
          <span
            v-if="
              result.author &&
              result._embedded &&
              result._embedded.author &&
              result._embedded.author[0]
            "
            class="flex items-center gap-1"
          >
            <span>•</span>
            <span>{{ result._embedded.author[0].name }}</span>
          </span>
          <span v-if="category === 'user' && result.roles" class="flex items-center gap-1">
            <span>•</span>
            <span>{{ result.roles.join(', ') }}</span>
          </span>
        </div>
      </div>
      <AppIcon icon="chevron_right" class="text-zinc-400 shrink-0" />
    </a>
  </li>
</template>
