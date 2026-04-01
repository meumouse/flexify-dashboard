<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '@/store/app/app.js';
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';
import { useWpNotifications } from '@/composables/useWpNotifications.js';
import AppIcon from '@/components/utility/icons/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import WpNotifications from './wp-notifications.vue';

/**
 * Notifications Panel
 * Displays notifications inline within the menu panel.
 *
 * @component
 * @example
 * <NotificationsPanel @close="handleClose" />
 */

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const appStore = useAppStore();
const notices = ref([]);
const loading = ref(false);
const dismissing = ref({});
const expandedNotices = ref(new Set());

// WordPress notifications - uses composable that runs immediately on mount
const { notificationsCount } = useWpNotifications();

/**
 * Toggle expanded state for long notices
 */
const toggleExpanded = (noticeId) => {
  const expanded = new Set(expandedNotices.value);
  if (expanded.has(noticeId)) {
    expanded.delete(noticeId);
  } else {
    expanded.add(noticeId);
  }
  expandedNotices.value = expanded;
};

/**
 * Check if notice content is long enough to need truncation
 */
const isLongContent = (content) => {
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.length > 180;
};

/**
 * Get truncated content for preview
 */
const getTruncatedContent = (content) => {
  const textContent = content.replace(/<[^>]*>/g, '');
  if (textContent.length <= 180) return content;

  const truncated = textContent.substring(0, 180);
  const lastSpace = truncated.lastIndexOf(' ');
  const breakPoint = lastSpace > 140 ? lastSpace : 180;

  return truncated.substring(0, breakPoint) + '...';
};

/**
 * Fetch all published admin notices from the REST API.
 * @returns {Promise<void>}
 */
const fetchNotices = async () => {
  loading.value = true;
  const args = {
    endpoint: 'wp/v2/flexify-dashboard-notices',
    params: { status: 'publish', per_page: 100 },
  };
  const response = await lmnFetch(args);
  loading.value = false;
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

const typeStyles = {
  info: {
    dotColor: 'bg-brand-500',
  },
  success: {
    dotColor: 'bg-green-500',
  },
  warning: {
    dotColor: 'bg-amber-500',
  },
  error: {
    dotColor: 'bg-red-500',
  },
};

const filteredNotices = computed(() =>
  notices.value.filter(appliesToCurrentUser)
);

const totalNotificationsCount = computed(() => {
  return filteredNotices.value.length + notificationsCount.value;
});

/**
 * Dismiss a notice for the current user by updating seen_by meta and sending a POST request.
 * @param {Object} notice
 */
const dismissNotice = async (notice) => {
  const userId = appStore.state.userID;
  if (!userId) return;
  dismissing.value[notice.id] = true;

  const response = await lmnFetch({
    endpoint: 'flexify-dashboard/v1/notices/seen',
    type: 'POST',
    data: {
      notice_id: notice.id,
    },
  });

  if (response && response.seen_by) {
    notice.meta.seen_by = response.seen_by;
  } else {
    let seenBy = Array.isArray(notice.meta?.seen_by)
      ? [...notice.meta.seen_by]
      : [];
    if (!seenBy.includes(Number(userId)) && !seenBy.includes(userId)) {
      seenBy.push(Number(userId));
    }
    notice.meta.seen_by = seenBy;
  }
  dismissing.value[notice.id] = false;
};

onMounted(() => {
  fetchNotices();
});
</script>

<template>
  <div
    class="h-full flex flex-col flexify-dashboard-normalize flex-1 min-h-0"
    style="font-size: 14px"
  >
    <!-- Header -->
    <div class="flex-shrink-0 pb-3 pt-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AppButton
            type="transparent"
            :title="__('Back to menu', 'flexify-dashboard')"
            @click="emit('close')"
            class="-ml-2"
          >
            <AppIcon
              icon="arrow_back"
              class="text-lg text-zinc-500 dark:text-zinc-400"
            />
          </AppButton>
          <div>
            <h1
              class="text-base font-semibold text-zinc-900 dark:text-zinc-100"
              style="margin: 0"
            >
              {{ __('Notifications', 'flexify-dashboard') }}
            </h1>
          </div>
        </div>
        <span
          v-if="totalNotificationsCount > 0"
          class="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {{ totalNotificationsCount }} {{ __('unread', 'flexify-dashboard') }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto min-h-0 -mx-6 px-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100"
        ></div>
      </div>

      <!-- WordPress Notifications Section -->
      <div
        v-if="notificationsCount > 0"
        class="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4"
      >
        <WpNotifications :is-open="isOpen" />
      </div>

      <!-- Empty State -->
      <div
        v-if="
          !loading && filteredNotices.length === 0 && notificationsCount === 0
        "
        class="flex flex-col items-center justify-center py-16 px-6 text-center"
      >
        <div
          class="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center mb-3"
        >
          <AppIcon icon="notifications" class="text-xl text-zinc-400" />
        </div>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-1">
          {{ __("You're all caught up", 'flexify-dashboard') }}
        </p>
        <p class="text-xs text-zinc-500 dark:text-zinc-500">
          {{ __('No new notifications', 'flexify-dashboard') }}
        </p>
      </div>

      <!-- Custom Admin Notices List -->
      <div
        v-if="filteredNotices.length > 0"
        class="divide-y divide-zinc-200 dark:divide-zinc-800 -mx-6"
      >
        <TransitionGroup name="notice">
          <div
            v-for="notice in filteredNotices"
            :key="notice.id"
            class="group relative hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div class="px-6 py-4">
              <div class="flex gap-3">
                <!-- Status Dot -->
                <div class="flex-shrink-0 pt-1.5">
                  <div
                    class="w-1.5 h-1.5 rounded-full"
                    :class="
                      typeStyles[notice.meta?.notice_type || 'info'].dotColor
                    "
                  ></div>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <!-- Title -->
                  <div
                    class="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-5 mb-1"
                    v-html="notice.title.rendered"
                  ></div>

                  <!-- Content -->
                  <div
                    class="text-sm text-zinc-600 dark:text-zinc-400 leading-5"
                  >
                    <div
                      v-if="!isLongContent(notice.content.rendered)"
                      v-html="notice.content.rendered"
                      class="prose-notice"
                    ></div>
                    <div v-else>
                      <div
                        v-if="!expandedNotices.has(notice.id)"
                        v-html="getTruncatedContent(notice.content.rendered)"
                        class="prose-notice"
                      ></div>
                      <div
                        v-else
                        v-html="notice.content.rendered"
                        class="prose-notice"
                      ></div>

                      <button
                        @click="toggleExpanded(notice.id)"
                        class="inline-flex items-center text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 mt-1 font-medium transition-colors"
                      >
                        {{
                          expandedNotices.has(notice.id)
                            ? __('Show less', 'flexify-dashboard')
                            : __('Show more', 'flexify-dashboard')
                        }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex-shrink-0 flex items-start pt-0.5">
                  <button
                    v-if="notice.meta?.dismissible"
                    @click="dismissNotice(notice)"
                    :disabled="dismissing[notice.id]"
                    class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <AppIcon
                      :icon="dismissing[notice.id] ? 'hourglass_empty' : 'close'"
                      class="text-sm"
                      :class="{ 'animate-pulse': dismissing[notice.id] }"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Notice transitions */
.notice-enter-active {
  transition: all 0.2s ease;
}
.notice-leave-active {
  transition: all 0.2s ease;
}
.notice-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.notice-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Prose styling for notice content */
.prose-notice :deep(p) {
  margin: 0;
  display: inline;
}
.prose-notice :deep(p + p) {
  margin-top: 0.5rem;
  display: block;
}
.prose-notice :deep(strong) {
  font-weight: 600;
  color: inherit;
}
.prose-notice :deep(a) {
  color: rgb(59 130 246);
  text-decoration: none;
}
.prose-notice :deep(a:hover) {
  text-decoration: underline;
}
.prose-notice :deep(ul),
.prose-notice :deep(ol) {
  margin: 0.5rem 0 0 0;
  padding-left: 1rem;
}
.prose-notice :deep(li) {
  margin: 0.25rem 0;
}
.dark .prose-notice :deep(a) {
  color: rgb(96 165 250);
}
</style>
