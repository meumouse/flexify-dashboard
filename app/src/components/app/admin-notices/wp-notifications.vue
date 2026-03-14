<script setup>
import { ref, watchEffect, nextTick, watch } from 'vue';
import { useWpNotifications } from '@/composables/useWpNotifications.js';

/**
 * WordPress Notifications Component
 * Handles WordPress native notifications via DOM manipulation.
 * Preserves original WordPress notice styling.
 * Uses composable for count tracking (runs immediately on mount).
 */
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

// Get targetSelector, movedNotices, and lockCount from composable
const { targetSelector, movedNotices, lockCount } = useWpNotifications();

const notificationList = ref(null);
const noticesMoved = ref(false);

const setNotifications = () => {
  if (noticesMoved.value) return;
  noticesMoved.value = true;

  if (!notificationList.value) return;

  // Find all notices, even if they're hidden
  // We need to query from the document body to find notices that might be hidden
  const allNotices = document.querySelectorAll(targetSelector);

  if (!allNotices || allNotices.length === 0) return;

  // Filter out notices that are already in our container
  const noticesToMove = [];
  for (let item of [...allNotices]) {
    // Skip if already in our container
    if (notificationList.value.contains(item)) continue;

    // Skip if no content or settings updated message
    if (!item.innerText || item.id == 'setting-error-settings_updated')
      continue;

    noticesToMove.push(item);
  }

  // Move notices to container and show them
  for (let item of noticesToMove) {
    // Remove the inline display:none style we set earlier
    item.style.display = '';
    // Move to container
    notificationList.value.appendChild(item);
    // Register as moved notice
    movedNotices.add(item);
  }

  // Lock the count once notices are moved to prevent polling from resetting it
  if (noticesToMove.length > 0) {
    lockCount();
  }
};

// Watch for drawer open to set WordPress notifications
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        setTimeout(() => {
          setNotifications();
        }, 100);
      });
    } else {
      noticesMoved.value = false;
    }
  }
);

// Watch for notificationList ref to be ready
const stopNotificationWatcher = watchEffect(async () => {
  if (!notificationList.value) return;

  await nextTick();
  setTimeout(() => {
    setNotifications();
    stopNotificationWatcher();
  }, 100);
});
</script>

<template>
  <div
    class="flex flex-col gap-3 wp-notifications-container"
    ref="notificationList"
  ></div>
</template>

<style>
/* Hide WordPress notices from the page */
#fd-body
  .notice:not(table .notice):not(#message.notice):not(.hide-if-js .notice):not(
    .themes .notice
  ):not(#setting-error-settings_updated) {
  display: none !important;
}

/* WordPress notice styling in panel - keep original WordPress styling, only affect notices in this container */
.wp-notifications-container .notice {
  margin: 0 !important;
  display: block !important;
}
</style>
