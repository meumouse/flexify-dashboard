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
      iconColor: 'text-green-400',
      dot: 'bg-green-400',
    },
    warning: {
      icon: 'warning',
      iconColor: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    error: {
      icon: 'error',
      iconColor: 'text-red-400',
      dot: 'bg-red-400',
    },
    info: {
      icon: 'info',
      iconColor: 'text-brand-400',
      dot: 'bg-brand-400',
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
        class="group bg-zinc-800/95 backdrop-blur-sm border border-zinc-800/50 rounded-xl shadow-lg pointer-events-auto transition-all duration-200 hover:border-zinc-700/60"
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
              class="text-sm font-medium text-white mb-1"
              v-html="noti.title"
            ></div>
            <div class="text-xs text-zinc-400" v-html="noti.message"></div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Loader -->
            <div v-if="noti.loader" class="w-4 h-4">
              <div
                class="w-4 h-4 border border-zinc-600 border-t-zinc-400 rounded-full animate-spin"
              ></div>
            </div>

            <!-- Close button -->
            <button
              v-else-if="noti.dismissable"
              @click="notificationsStore.remove(index)"
              class="w-6 h-6 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
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
