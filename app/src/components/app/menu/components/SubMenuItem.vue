<script setup>
import { computed, inject } from 'vue';
import { returnOriginalLinkAttribute } from '../utils/returnOriginalLinkAttribute.js';
import { formatUrl } from '../utils/formatUrl.js';
import AppIcon from '@/components/utility/icons/index.vue';
import NotificationBadge from './NotificationBadge.vue';

const props = defineProps({
  sublink: {
    type: Object,
    required: true,
  },
  isFocused: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  hideFavorite: {
    type: Boolean,
    default: false,
  },
});

// Inject addFavorite from parent component
const addFavorite = inject('addFavorite', null);

// Helps trigger events on original nodes
const triggerBaseNode = (evt) => {
  if (!props.sublink.og_node) return;

  const event = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  props.sublink.og_node.dispatchEvent(event);
};

// Get the raw notification count from the sublink
const notificationCount = computed(() => {
  return returnOriginalLinkAttribute(
    props.sublink,
    'notifications',
    props.sublink.notifications
  );
});

/**
 * Computed property to ensure the URL is properly formatted
 * @returns {string} The properly formatted URL
 */
const formattedUrl = computed(() => formatUrl(props.sublink?.url));
</script>

<template>
  <a
    :href="formattedUrl"
    :id="sublink.sub_id"
    class="flex flex-row p-1.5 px-4 rounded-lg items-center cursor-pointer gap-1 group transition-all duration-200"
    :class="
      isActive || isFocused
        ? 'text-white bg-white/8'
        : 'text-[rgba(255,255,255,0.75)] hover:text-white hover:bg-white/8'
    "
    @click="triggerBaseNode($event)"
  >
    <div
      class="transition-color grow text-base truncate flex flex-row items-center gap-4"
    >
      <div
        v-html="
          sublink.settings?.name ||
          returnOriginalLinkAttribute(sublink, 'name', sublink.name)
        "
        class="truncate"
      ></div>
      <!-- Notification badge -->
      <NotificationBadge :count="notificationCount" size="small" />
    </div>

    <!-- Favorite icon -->
    <AppIcon
      v-if="!isFavorite && !hideFavorite && addFavorite"
      icon="star"
      class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
      @click.prevent.stop="addFavorite(sublink)"
    />

    <!-- Open in new -->
    <AppIcon
      v-if="sublink.settings?.open_new"
      icon="open_new"
      :class="isActive || isFocused ? 'opacity-100' : ''"
      class="opacity-0 group-hover:opacity-100 text-base transition-opacity"
    />
  </a>
</template>

<style scoped>
/* Ensure proper text rendering for dynamic content */
div[v-html] {
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Handle long text gracefully */
@supports (display: -webkit-box) {
	div[v-html] {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
}
</style>
