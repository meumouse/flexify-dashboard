<script setup>
import { computed } from 'vue';
import { returnOriginalLinkAttribute } from '../utils/returnOriginalLinkAttribute.js';
import NotificationBadge from './NotificationBadge.vue';

const props = defineProps({
  link: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

// Get the raw notification count from the link
const notificationCount = computed(() => {
  return returnOriginalLinkAttribute(
    props.link,
    'notifications',
    props.link.notifications
  );
});

// Computed property for the menu name with fallback
const menuName = computed(() => {
  return (
    props.link.settings?.name ||
    returnOriginalLinkAttribute(props.link, 'name', props.link.name) ||
    ''
  );
});
</script>

<template>
  <div class="ps-9 flex-grow flex items-center justify-between gap-3 min-w-0">
    <!-- Menu name with improved typography -->
    <div
      class="flex-1 min-w-0 font-medium leading-5 text-theme-sm transition-colors duration-150"
      v-html="menuName"
    />

    <!-- Notification badge -->
    <NotificationBadge :count="notificationCount" size="default" />
  </div>
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
