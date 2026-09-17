<script setup>
import { ref } from 'vue';

// Get noti store
import { useNotificationStore } from '@/store/notifications/notifications.js';
const notificationsStore = useNotificationStore();

// Import icons
import AppIcon from '@/components/utility/icons/index.vue';

/**
 * Returns minimal styling for each notification type
 */
const getNotificationStyles = (type) => {
  const styles = {
    success: {
      icon: 'tick',
      iconColor: 'text-success-500',
      dot: 'bg-success-500',
    },
    warning: {
      icon: 'warning',
      iconColor: 'text-warning-500',
      dot: 'bg-warning-500',
    },
    error: {
      icon: 'error',
      iconColor: 'text-error-500',
      dot: 'bg-error-500',
    },
    info: {
      icon: 'info',
      iconColor: 'text-brand-500',
      dot: 'bg-brand-500',
    },
  };

  return styles[type] || styles.info;
};
</script>

<template>
  <div class="flexify-dashboard-isolation font-sans">
    <TransitionGroup
      tag="div"
      name="notification"
      class="fixed bottom-6 right-6 w-80 flex flex-col-reverse gap-2 z-[999999] pointer-events-none"
    >
      <div
        v-for="(noti, index) in notificationsStore.getAll"
        :key="noti.id"
        class="group rounded-xl border border-gray-200 bg-white shadow-theme-lg pointer-events-auto transition-all duration-200 dark:border-gray-800 dark:bg-gray-dark"
      >
        <div class="flex items-start gap-3 p-4">
          <!-- Status dot -->
          <div
            class="w-2 h-2 rounded-full flex-shrink-0 mt-2"
            :class="getNotificationStyles(noti.type).dot"
          ></div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div
              class="mb-0.5 text-sm font-medium text-gray-800 dark:text-white/90"
              v-html="noti.title"
            ></div>
            <div class="text-theme-xs text-gray-500 dark:text-gray-400" v-html="noti.message"></div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Loader -->
            <div v-if="noti.loader" class="w-4 h-4">
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"
              ></div>
            </div>

            <!-- Close button -->
            <button
              v-else-if="noti.dismissable"
              @click="notificationsStore.remove(index)"
              class="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              <AppIcon icon="close" class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <component is="style">
      /* Minimal animations that match your app's style */
      .notification-enter-active { transition: all 0.3s cubic-bezier(0.16, 1,
      0.3, 1); } .notification-leave-active { transition: all 0.25s
      cubic-bezier(0.4, 0, 1, 1); } .notification-enter-from { opacity: 0;
      transform: translateX(100%) scale(0.95); } .notification-leave-to {
      opacity: 0; transform: translateX(100%) scale(0.95); } .notification-move
      { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    </component>
  </div>
</template>
