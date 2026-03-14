<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// Store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

// Funcs
import { lmnFetch } from '@/assets/js/functions/lmnFetch.js';

// Comps
import AppIcon from '@/components/utility/icons/index.vue';

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
});

// Refs
const userActivities = ref([]);
const loadingActivities = ref(false);
const activityLogEnabled = computed(() => {
  return appStore.state.flexify_dashboard_settings?.enable_activity_logger === true;
});

/**
 * Parse date string, handling UTC dates without timezone info
 */
const parseDate = (dateString) => {
  if (!dateString) return null;

  // If date string doesn't have timezone info and looks like MySQL datetime, treat as UTC
  if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return new Date(dateString + 'Z');
  }

  // If it's already ISO 8601 with timezone indicator (Z or offset like +00:00, -05:00), use as-is
  if (
    dateString.includes('T') &&
    (dateString.endsWith('Z') || dateString.match(/[+-]\d{2}:\d{2}$/))
  ) {
    return new Date(dateString);
  }

  // If it's ISO 8601 format without timezone (e.g., "2024-01-01T12:00:00"), treat as UTC
  if (
    dateString.includes('T') &&
    !dateString.endsWith('Z') &&
    !dateString.match(/[+-]\d{2}:\d{2}$/)
  ) {
    return new Date(dateString + 'Z');
  }

  // Try parsing as-is
  const parsed = new Date(dateString);

  // If invalid, try adding UTC indicator
  if (isNaN(parsed.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateString + 'Z');
  }

  return parsed;
};

/**
 * Format date to relative time
 */
const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return __('Just now', 'flexify-dashboard');
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? __('1 minute ago', 'flexify-dashboard')
      : __('%d minutes ago', 'flexify-dashboard').replace('%d', diffInMinutes);
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1
      ? __('1 hour ago', 'flexify-dashboard')
      : __('%d hours ago', 'flexify-dashboard').replace('%d', diffInHours);
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1
      ? __('1 day ago', 'flexify-dashboard')
      : __('%d days ago', 'flexify-dashboard').replace('%d', diffInDays);
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Get action icon
 */
const getActionIcon = (action) => {
  const icons = {
    created: 'add',
    updated: 'edit',
    deleted: 'delete',
    trashed: 'delete',
    restored: 'restore',
    activated: 'check_circle',
    deactivated: 'cancel',
    installed: 'download',
    login: 'login',
    logout: 'logout',
    role_changed: 'admin_users',
    status_changed: 'flag',
    uploaded: 'upload',
  };
  return icons[action] || 'info';
};

/**
 * Get action color
 */
const getActionColor = (action) => {
  const colors = {
    created:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    updated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    trashed:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    restored:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    activated:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    deactivated:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    installed:
      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    login:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    logout: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
    role_changed:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    status_changed:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    uploaded:
      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };
  return (
    colors[action] ||
    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
  );
};

/**
 * Get object title
 */
const getObjectTitle = (activity) => {
  if (activity.metadata?.title) {
    return activity.metadata.title;
  }
  if (activity.new_value?.title) {
    return activity.new_value.title;
  }
  if (activity.old_value?.title) {
    return activity.old_value.title;
  }
  if (activity.object_id) {
    return `${activity.object_type} #${activity.object_id}`;
  }
  return activity.object_type;
};

/**
 * Fetch user activities
 */
const fetchUserActivities = async () => {
  if (!activityLogEnabled.value || !props.userId) return;

  loadingActivities.value = true;

  try {
    const args = {
      endpoint: 'flexify-dashboard/v1/activity-log',
      params: {
        user_id: props.userId,
        per_page: 10,
        orderby: 'created_at',
        order: 'DESC',
      },
    };

    const data = await lmnFetch(args);

    if (data?.data) {
      userActivities.value = data.data;
    }
  } catch (error) {
    console.error('Failed to fetch user activities:', error);
    userActivities.value = [];
  } finally {
    loadingActivities.value = false;
  }
};

/**
 * Get activity log details URL
 */
const getActivityLogUrl = (activityId) => {
  const adminUrl = appStore.state.adminUrl || '';
  return `${adminUrl}admin.php?page=flexify-dashboard-activity-log#/details/${activityId}`;
};

/**
 * Handle activity item click
 */
const handleActivityClick = (activity) => {
  const url = getActivityLogUrl(activity.id);
  window.open(url, '_blank');
};

// Watch for userId changes
watch(
  () => props.userId,
  async (newUserId) => {
    if (newUserId && activityLogEnabled.value) {
      await fetchUserActivities();
    }
  }
);

// Lifecycle
onMounted(async () => {
  if (activityLogEnabled.value) {
    await fetchUserActivities();
  }
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <label
        class="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500"
      >
        {{ __('Recent Activity', 'flexify-dashboard') }}
      </label>
    </div>

    <!-- Loading State -->
    <div v-if="loadingActivities" class="py-4 text-center">
      <AppIcon
        icon="refresh"
        class="text-lg text-zinc-400 dark:text-zinc-500 animate-spin mx-auto"
      />
    </div>

    <!-- Activities List -->
    <div v-else-if="userActivities.length > 0" class="space-y-2">
      <div
        v-for="activity in userActivities"
        :key="activity.id"
        @click="handleActivityClick(activity)"
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        <!-- Action Badge -->
        <span
          :class="[
            'px-2 py-0.5 text-[10px] font-medium rounded uppercase flex items-center gap-1 flex-shrink-0',
            getActionColor(activity.action),
          ]"
        >
          <AppIcon :icon="getActionIcon(activity.action)" class="text-[10px]" />
          {{ activity.action }}
        </span>

        <!-- Activity Info -->
        <div class="flex-1 min-w-0 text-xs text-zinc-600 dark:text-zinc-400">
          <span class="font-medium">{{ activity.object_type }}</span>
          <span v-if="activity.object_id"> #{{ activity.object_id }}</span>
          <span
            v-if="
              getObjectTitle(activity) &&
              getObjectTitle(activity) !== activity.object_type
            "
            class="text-zinc-500 dark:text-zinc-500"
          >
            : {{ getObjectTitle(activity) }}
          </span>
        </div>

        <!-- Timestamp -->
        <span class="text-xs text-zinc-500 dark:text-zinc-500 flex-shrink-0">
          {{ formatRelativeTime(activity.created_at) }}
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
    >
      {{ __('No recent activity', 'flexify-dashboard') }}
    </div>
  </div>
</template>
