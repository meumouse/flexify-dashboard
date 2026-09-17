<script setup>
import { computed } from 'vue';
import { formatUrl } from '../utils/formatUrl.js';

const props = defineProps({
  link: {
    type: Object,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isFocused: {
    type: Boolean,
    default: false,
  },
});

/**
 * Computed property to ensure the URL is properly formatted
 * @returns {string} The properly formatted URL
 */
const formattedUrl = computed(() => formatUrl(props.link?.url));
</script>

<template>
  <a
    :href="formattedUrl"
    :id="link.id"
    class="group relative flex min-h-10 w-full cursor-pointer flex-row items-center gap-1 rounded-lg text-theme-sm font-medium transition-colors duration-150"
    :class="
      isActive || isFocused
        ? 'active bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300'
    "
    :target="link.settings?.open_new ? '_BLANK' : ''"
  >
    <slot />
  </a>
</template>
