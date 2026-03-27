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
    class="flex flex-row rounded-xl items-center cursor-pointer gap-1 group transition-colors duration-150 relative border border-transparent"
    :class="
      isActive || isFocused
        ? 'text-white active bg-white/8 shadow-sm border-white/15'
        : 'text-[rgba(255,255,255,0.75)] hover:text-white hover:bg-white/8 hover:shadow-sm hover:border-white/15'
    "
    :target="link.settings?.open_new ? '_BLANK' : ''"
  >
    <slot />
  </a>
</template>
