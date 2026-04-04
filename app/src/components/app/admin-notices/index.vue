<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useWpNotifications } from '@/composables/useWpNotifications.js';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

import '@/assets/css/partials/notices.css';

/**
 * Admin Notices Toggle Button
 * Displays a notification bell icon that toggles the notifications panel.
 * The panel content is now handled by NotificationsPanel.vue
 *
 * @component
 * @example
 * <AdminNotices v-model="showNotifications" />
 */

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const appStore = useAppStore();
const notices = ref([]);

// WordPress notifications - uses composable that runs immediately on mount
const { notificationsCount, isJiggling } = useWpNotifications();

/**
 * Fetch all published admin notices from the REST API.
 * @returns {Promise<void>}
 */
const fetchNotices = async () => {
  const args = {
    endpoint: 'wp/v2/flexify-dashboard-notices',
    params: { status: 'publish', per_page: 100 },
  };
  const response = await lmnFetch(args);
  if (response && response.data) {
    notices.value = response.data;
  }
};

/**
 * Checks if a notice applies to the current user by user ID or user role.
 * @param {Object} notice - The notice object
 * @returns {boolean}
 */
const appliesToCurrentUser = (notice) => {
  const userId = appStore.state.userID;
  const userRoles = appStore.state.userRoles || [];
  const roles = notice.meta?.roles || [];
  const seenBy = notice.meta?.seen_by || [];
  if (seenBy.includes(Number(userId)) || seenBy.includes(userId)) return false;
  if (!roles.length) return true;
  if (roles.some((r) => r.type === 'user' && r.id == userId)) return true;
  if (roles.some((r) => r.type === 'role' && userRoles.includes(r.value)))
    return true;
  return false;
};

const filteredNotices = computed(() =>
  notices.value.filter(appliesToCurrentUser)
);

const totalNotificationsCount = computed(() => {
  return filteredNotices.value.length + notificationsCount.value;
});

/**
 * Toggle the notifications panel
 */
const toggleNotifications = () => {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
};

onMounted(() => {
  fetchNotices();
});
</script>

<template>
  <AppButton
    type="transparent"
    :title="__('Notifications', 'flexify-dashboard')"
    @click="toggleNotifications"
    class="relative"
  >
    <div class="relative" :class="{ 'animate-jiggle': isJiggling }">
      <AppIcon
        :icon="modelValue ? 'bolt_fill' : 'bolt_fill'"
        class="text-xl text-slate-400 transition-colors"
        :class="modelValue ? 'text-zinc-900 dark:text-zinc-100' : ''"
      />
      <Transition>
        <span
          v-if="totalNotificationsCount > 0 && !modelValue"
          class="absolute top-0 right-0 inline-flex items-center justify-center text-xs font-bold leading-none text-rose-100 transform bg-rose-600 dark:bg-rose-700 rounded-full aspect-square h-2"
        >
        </span>
      </Transition>
    </div>
  </AppButton>
</template>

<style>
@keyframes jiggle {
  0% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(-8deg);
  }

  50% {
    transform: rotate(7deg);
  }

  75% {
    transform: rotate(-8deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

.animate-jiggle {
  animation: jiggle 0.5s ease-in-out;
}
</style>
